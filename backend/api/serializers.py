from rest_framework import serializers
from .models import *
import re


def _collapse_spaces(value):
    return re.sub(r'\s+', ' ', str(value or '')).strip()


def _normalize_name(value):
    return _collapse_spaces(value).lower()


def _sanitize_entry_title(title, parties=None, witnesses=None):
    clean_title = _collapse_spaces(title)
    for person in list(parties or []) + list(witnesses or []):
        name = _collapse_spaces(person.get('name') if isinstance(person, dict) else getattr(person, 'name', ''))
        if not name:
            continue
        clean_title = re.sub(rf'\b{re.escape(name)}\b', ' ', clean_title, flags=re.IGNORECASE)
        clean_title = re.sub(r'\s*[-–—,/;:]+\s*$', '', clean_title)
        clean_title = re.sub(r'^\s*[-–—,/;:]+\s*', '', clean_title)
        clean_title = _collapse_spaces(clean_title)
    return clean_title


# USER

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email',
            'first_name', 'last_name',
            'role', 'is_active',
            'requires_password_change',
            'last_login', 'date_joined',
        ]
        read_only_fields = ['last_login', 'date_joined', 'requires_password_change']


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    """Used for creating/updating users. Password is write-only and hashed."""
    password = serializers.CharField(
        write_only=True, required=True, min_length=8,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email',
            'first_name', 'last_name',
            'role', 'is_active', 'password',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.requires_password_change = True
        user.save()
        return user

    def update(self, instance, validated_data):
        # Password is NOT updated here — that belongs in Settings
        validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

# IDENTITY

class IdentitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Identity
        fields = ['id', 'id_type', 'id_number', 'issue_date', 'expiry_date']


# PARTY (WITH IDENTITY)

class PartySerializer(serializers.ModelSerializer):
    identities = IdentitySerializer(many=True)

    class Meta:
        model = Party
        fields = ['id', 'name', 'address', 'identities']


# WITNESS

class WitnessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Witness
        fields = ['id', 'name', 'address']



# BOOK

class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            'id',
            'book_number',
            'total_pages',
            'appointment_date',
            'expiration_date',
            'created_at',
            'is_archived',
            'archived_at',
            'is_deleted',
            'deleted_at',
        ]
        read_only_fields = ['id', 'created_at', 'is_archived', 'archived_at', 'is_deleted', 'deleted_at']

    def validate_book_number(self, value):
        qs = Book.objects.filter(book_number=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('This book number is already reserved by an active or archived book.')
        return value



# PAGE

class PageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Page
        fields = '__all__'



# ENTRY (MAIN LOGIC)

class EntrySerializer(serializers.ModelSerializer):

    parties = PartySerializer(many=True)
    witnesses = WitnessSerializer(many=True)
    page = PageSerializer(read_only=True)
    book_number = serializers.CharField(source='book.book_number', read_only=True)

    class Meta:
        model = Entry
        fields = [
            'id',
            'book',
            'book_number',
            'page',
            'entry_number',
            'title',
            'date_time',
            'notarial_type',
            'fees',
            'or_number',
            'remarks',
            'parties',
            'witnesses',
            'is_archived',
            'archived_at',
            'is_deleted',
            'deleted_at',
        ]
        read_only_fields = ['page', 'user']



    # VALIDATION

    def validate(self, data):
        book = data.get('book')
        entry_number = data.get('entry_number')
        parties = data.get('parties', [])
        witnesses = data.get('witnesses', [])
        title = data.get('title')

        if title is not None:
            data['title'] = _sanitize_entry_title(title, parties, witnesses)
            if not data['title']:
                raise serializers.ValidationError({
                    'title': 'Enter only the title or description of the instrument. Do not use party or witness names as the title.'
                })

        party_names = {_normalize_name(p.get('name')) for p in parties if _normalize_name(p.get('name'))}
        duplicate_people = [
            _collapse_spaces(w.get('name'))
            for w in witnesses
            if _normalize_name(w.get('name')) in party_names
        ]
        if duplicate_people:
            raise serializers.ValidationError({
                'witnesses': f"Parties and witnesses must be different people: {', '.join(duplicate_people)}."
            })

        if entry_number is not None and (entry_number < 1 or entry_number > 525):
            raise serializers.ValidationError("Entry number must be between 1 and 525.")

        if book and entry_number is not None:
            qs = Entry.objects.filter(book=book, entry_number=entry_number)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                reusable_deleted_slot = (
                    self.instance
                    and self.instance.is_archived
                    and self.instance.is_deleted
                    and self.context.get('view')
                    and getattr(self.context.get('view'), 'action', None) == 'replace_deleted'
                )
                if not reusable_deleted_slot:
                    raise serializers.ValidationError("This entry number is already reserved in this book.")

        if book and not self.instance:
            if Entry.objects.filter(book=book).count() >= 525:
                raise serializers.ValidationError("This book already has 525 entries.")

        return data



    # CREATE (AUTO PAGE + NESTED)

    def create(self, validated_data):
        request = self.context.get('request')
        user = validated_data.pop('user', None)
        if user is None:
            user = getattr(request, 'user', None) if request else None
        if not user or not user.is_authenticated:
            raise serializers.ValidationError('Authentication required to create entries.')

        if not user.is_active:
            raise serializers.ValidationError('Cannot create entries for a deactivated account.')

        parties_data = validated_data.pop('parties')
        witnesses_data = validated_data.pop('witnesses')

        book = validated_data.get('book')
        entry_number = validated_data.get('entry_number')

        # AUTO PAGE (5 entries per page)
        page_number = ((entry_number - 1) // 5) + 1

        page, _ = Page.objects.get_or_create(
            book=book,
            page_number=page_number
        )

        entry = Entry.objects.create(
            **validated_data,
            user=user,
            page=page
        )

        # Parties + Identities
        for party_data in parties_data:
            identities_data = party_data.pop('identities')
            party = Party.objects.create(entry=entry, **party_data)

            for identity_data in identities_data:
                Identity.objects.create(party=party, **identity_data)

        # Witnesses
        for witness_data in witnesses_data:
            Witness.objects.create(entry=entry, **witness_data)

        return entry



    # UPDATE (WITH NESTED PARTIES + WITNESSES)

    def update(self, instance, validated_data):
        instance.title = validated_data.get('title', instance.title)
        instance.date_time = validated_data.get('date_time', instance.date_time)
        instance.notarial_type = validated_data.get('notarial_type', instance.notarial_type)
        instance.fees = validated_data.get('fees', instance.fees)
        instance.or_number = validated_data.get('or_number', instance.or_number)
        instance.remarks = validated_data.get('remarks', instance.remarks)

        instance.save()

        # Replace parties if provided
        parties_data = validated_data.get('parties')
        if parties_data is not None:
            instance.parties.all().delete()
            for party_data in parties_data:
                identities_data = party_data.pop('identities', [])
                party = Party.objects.create(entry=instance, **party_data)
                for identity_data in identities_data:
                    Identity.objects.create(party=party, **identity_data)

        # Replace witnesses if provided
        witnesses_data = validated_data.get('witnesses')
        if witnesses_data is not None:
            instance.witnesses.all().delete()
            for witness_data in witnesses_data:
                Witness.objects.create(entry=instance, **witness_data)

        return instance


class EntryLiteSerializer(serializers.ModelSerializer):
    """Lightweight list serializer for dashboards/charts."""

    class Meta:
        model = Entry
        fields = [
            'id',
            'book',
            'date_time',
            'notarial_type',
            'fees',
            'remarks',
            'is_archived',
            'is_deleted',
        ]


class ClientIntakePartySerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientIntakeParty
        fields = ['id', 'name', 'address', 'id_type', 'id_number']
        read_only_fields = ['id']


class ClientIntakeSerializer(serializers.ModelSerializer):
    parties = ClientIntakePartySerializer(many=True)

    class Meta:
        model = ClientIntake
        fields = [
            'id',
            'queue_number',
            'client_name',
            'address',
            'parties',
            'scheduled_date',
            'status',
            'cancel_reason',
            'cancelled_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'queue_number', 'client_name', 'address', 'cancelled_at', 'created_at', 'updated_at']

    def validate_parties(self, value):
        if not value:
            raise serializers.ValidationError('Add at least one client or party.')
        for index, party in enumerate(value, start=1):
            if not party.get('id_type') or not party.get('id_number'):
                raise serializers.ValidationError(f'Client {index} must have exactly one ID type and ID number.')
        return value

    def create(self, validated_data):
        parties_data = validated_data.pop('parties')
        first_party = parties_data[0]
        intake = ClientIntake.objects.create(
            client_name=first_party.get('name', ''),
            address=first_party.get('address', ''),
            **validated_data,
        )
        for party_data in parties_data:
            ClientIntakeParty.objects.create(intake=intake, **party_data)
        return intake

    def update(self, instance, validated_data):
        parties_data = validated_data.pop('parties', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if parties_data is not None:
            first_party = parties_data[0] if parties_data else {}
            instance.client_name = first_party.get('name', instance.client_name)
            instance.address = first_party.get('address', instance.address)
        instance.save()
        if parties_data is not None:
            instance.parties.all().delete()
            for party_data in parties_data:
                ClientIntakeParty.objects.create(intake=instance, **party_data)
        return instance


class WorkflowDraftSerializer(serializers.ModelSerializer):
    intake_detail = ClientIntakeSerializer(source='intake', read_only=True)
    finalized_entry_number = serializers.IntegerField(source='finalized_entry.entry_number', read_only=True)
    finalized_book_number = serializers.CharField(source='finalized_entry.book.book_number', read_only=True)
    finalized_page_number = serializers.IntegerField(source='finalized_entry.page.page_number', read_only=True)

    class Meta:
        model = WorkflowDraft
        fields = [
            'id',
            'intake',
            'intake_detail',
            'document_title',
            'notarial_type',
            'notarization_datetime',
            'fees',
            'or_number',
            'remarks',
            'witnesses',
            'status',
            'finalized_entry',
            'finalized_entry_number',
            'finalized_book_number',
            'finalized_page_number',
            'created_at',
            'updated_at',
            'finalized_at',
        ]
        read_only_fields = [
            'id',
            'status',
            'finalized_entry',
            'finalized_entry_number',
            'finalized_book_number',
            'finalized_page_number',
            'created_at',
            'updated_at',
            'finalized_at',
        ]

    def validate_witnesses(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Witnesses must be a list.')
        return value

    def validate(self, data):
        draft = self.instance
        merged = {
            'document_title': data.get('document_title', getattr(draft, 'document_title', '')),
            'notarial_type': data.get('notarial_type', getattr(draft, 'notarial_type', '')),
            'fees': data.get('fees', getattr(draft, 'fees', None)),
            'notarization_datetime': data.get('notarization_datetime', getattr(draft, 'notarization_datetime', None)),
            'or_number': data.get('or_number', getattr(draft, 'or_number', '')),
            'remarks': data.get('remarks', getattr(draft, 'remarks', '')),
            'witnesses': data.get('witnesses', getattr(draft, 'witnesses', [])),
        }
        missing = []
        for field in ['document_title', 'notarial_type', 'notarization_datetime', 'fees', 'or_number', 'remarks']:
            if merged[field] in (None, ''):
                missing.append(field)
        if not merged['witnesses']:
            missing.append('witnesses')
        if missing:
            raise serializers.ValidationError({
                'detail': f"Complete all draft fields before saving: {', '.join(missing)}."
            })
        return data


# AUDIT LOG

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = ['id', 'user', 'username', 'action', 'model_name', 'object_id', 'timestamp', 'description']

    def get_username(self, obj):
        return obj.user.username if obj.user_id else None
