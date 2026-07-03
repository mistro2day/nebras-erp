from django.db import models
from apps.common.models import CombinedBaseModel
import uuid

class Account(CombinedBaseModel):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, db_index=True) # شجرة الحسابات COA
    type = models.CharField(max_length=50) # asset, liability, equity, revenue, expense

    class Meta:
        db_table = 'finance_accounts'
        unique_together = ('tenant_id', 'code')


class Transaction(CombinedBaseModel):
    date = models.DateField(db_index=True)
    description = models.TextField()
    reference = models.CharField(max_length=100, blank=True, null=True, db_index=True)

    class Meta:
        db_table = 'finance_transactions'


class TransactionLine(CombinedBaseModel):
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='transaction_lines')
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)

    class Meta:
        db_table = 'finance_transaction_lines'