from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .audit_service import record_audit
from .models import User
from .serializers import UserSerializer


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds user payload including requires_password_change for the SPA."""

    username_field = User.USERNAME_FIELD

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if not user.is_active:
            raise serializers.ValidationError({'detail': 'Account is deactivated.'})
        data['user'] = UserSerializer(user).data
        record_audit(
            user=user,
            action='LOGIN',
            model_name='AuthSession',
            object_id=user.pk,
            description=f'{user.username} signed in',
        )
        return data


class CompleteFirstLoginSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, attrs):
        request = self.context['request']
        user = request.user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError(
                {'current_password': ['Current password is incorrect.']}
            )
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': ['Passwords do not match.']})
        validate_password(attrs['new_password'], user=user)
        return attrs
