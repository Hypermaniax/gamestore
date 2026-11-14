// Server Actions for checkout, buyer transaction reads, reveal, and settings.

'use server'

import { transactionService } from '@/src/services/transaction.service'
import { paymentService } from '@/src/services/payment.service'
import { settingService } from '@/src/services/setting.service'
import type {
  CheckoutInput,
  ChangeMethodInput,
  AllowRevealInput,
  RefundCompleteInput,
  TransactionAdminListInput,
  SettingUpdateInput,
  TransactionCodeInput,
  TransactionListInput,
} from '@/src/validation/transaksi'

export async function listTransactionsAdminAction(input: TransactionAdminListInput) {
  return transactionService.listAdmin(input)
}

export async function detailTransactionAdminAction(input: TransactionCodeInput) {
  return transactionService.detailAdmin(input)
}

export async function summaryAdminAction() {
  return transactionService.summaryAdmin()
}

export async function syncTransactionAdminAction(input: TransactionCodeInput) {
  return transactionService.syncAdmin(input)
}

export async function markDisputeAction(input: TransactionCodeInput) {
  return transactionService.markDispute(input)
}

export async function closeDisputeAction(input: TransactionCodeInput) {
  return transactionService.closeDispute(input)
}

export async function completeRefundAction(input: RefundCompleteInput) {
  return transactionService.completeRefund(input)
}

export async function grantRevealAction(input: AllowRevealInput) {
  return transactionService.grantReveal(input)
}

export async function checkoutAction(input: CheckoutInput) {
  return transactionService.checkout(input)
}

export async function listTransactionsAction(input: TransactionListInput) {
  return transactionService.list(input)
}

export async function detailTransactionAction(input: TransactionCodeInput) {
  return transactionService.detail(input)
}

export async function statusTransactionAction(input: TransactionCodeInput) {
  return transactionService.status(input)
}

export async function cancelTransactionAction(input: TransactionCodeInput) {
  return transactionService.cancel(input)
}

export async function changeTransactionMethodAction(input: ChangeMethodInput) {
  return transactionService.changeMethod(input)
}

export async function revealTransactionAction(input: TransactionCodeInput) {
  return transactionService.reveal(input)
}

export async function confirmReceivedAction(input: TransactionCodeInput) {
  return transactionService.confirmReceived(input)
}

export async function listPaymentMethodsAction() {
  return paymentService.listMethods()
}

export async function getSettingPublicAction() {
  return settingService.getPublic()
}

export async function getSettingAdminAction() {
  return settingService.getAdmin()
}

export async function updateSettingAction(input: SettingUpdateInput) {
  return settingService.update(input)
}
