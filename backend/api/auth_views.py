from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .audit_service import record_audit
from .auth_serializers import CompleteFirstLoginSerializer, CustomTokenObtainPairSerializer
from .serializers import UserSerializer


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_me(request):
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auth_logout(request):
    record_audit(
        user=request.user,
        action='LOGOUT',
        model_name='AuthSession',
        object_id=request.user.pk,
        description=f'{request.user.username} signed out',
    )
    return Response({'detail': 'Logged out.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auth_complete_first_login(request):
    user = request.user
    if not user.requires_password_change:
        return Response(
            {'message': 'No password reset required.', 'user': UserSerializer(user).data},
            status=200,
        )

    serializer = CompleteFirstLoginSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    validated = serializer.validated_data
    user.set_password(validated['new_password'])
    user.requires_password_change = False
    user.save(update_fields=['password', 'requires_password_change'])

    record_audit(
        user=user,
        action='PASSWORD_CHANGE',
        model_name='User',
        object_id=user.pk,
        description='Mandatory first-login password change completed',
    )

    return Response(
        {'message': 'Password updated.', 'user': UserSerializer(user).data},
        status=200,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auth_change_password(request):
    """
    Voluntary password change from Settings (same validation as first-login flow).
    JWT access tokens may become invalid after password change; clients should re-authenticate.
    """
    serializer = CompleteFirstLoginSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)
    validated = serializer.validated_data
    user = request.user
    user.set_password(validated['new_password'])
    user.save(update_fields=['password'])

    record_audit(
        user=user,
        action='PASSWORD_CHANGE',
        model_name='User',
        object_id=user.pk,
        description='Password changed from account settings',
    )

    return Response(
        {'message': 'Password updated.', 'user': UserSerializer(user).data},
        status=200,
    )
