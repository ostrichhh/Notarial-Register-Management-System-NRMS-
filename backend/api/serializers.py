from rest_framework import serializers
from .models import *


# USER

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role']

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
        fields = '__all__'



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

    class Meta:
        model = Entry
        fields = [
            'id',
            'book',
            'page',
            'entry_number',
            'title',
            'date_time',
            'notarial_type',
            'fees',
            'or_number',
            'remarks',
            'parties',
            'witnesses'
        ]
        read_only_fields = ['page', 'user']



    # VALIDATION

    def validate(self, data):
        book = data.get('book')
        entry_number = data.get('entry_number')

        if entry_number < 1 or entry_number > 525:
            raise serializers.ValidationError("Entry number must be between 1 and 525.")

        if Entry.objects.filter(book=book, entry_number=entry_number).exists():
            raise serializers.ValidationError("Entry number already exists in this book.")

        if Entry.objects.filter(book=book).count() >= 525:
            raise serializers.ValidationError("This book already has 525 entries.")

        return data



    # CREATE (AUTO PAGE + NESTED)

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user

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



    # UPDATE

    def update(self, instance, validated_data):
        instance.title = validated_data.get('title', instance.title)
        instance.date_time = validated_data.get('date_time', instance.date_time)
        instance.notarial_type = validated_data.get('notarial_type', instance.notarial_type)
        instance.fees = validated_data.get('fees', instance.fees)
        instance.or_number = validated_data.get('or_number', instance.or_number)
        instance.remarks = validated_data.get('remarks', instance.remarks)

        instance.save()
        return instance