from rest_framework.routers import DefaultRouter
from .views import EntryViewSet, BookViewSet

router = DefaultRouter()
router.register(r'entries', EntryViewSet)
router.register(r'books', BookViewSet)

urlpatterns = router.urls