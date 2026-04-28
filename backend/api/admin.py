from django.contrib import admin
from .models import *

# Register your models here.
admin.site.register(User)
admin.site.register(Book)
admin.site.register(Page)
admin.site.register(Entry)
admin.site.register(Party)
admin.site.register(Witness)
admin.site.register(Identity)
admin.site.register(AuditLog)