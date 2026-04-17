export enum Resource {
	PAYMENTS = 'payments',
	ORDER_ACTIONS = 'orderActions',
	REFUND = 'refund',
	SUBSCRIPTION = 'subscription',
	/** Resource key for Settlement (stored on workflow JSON as `resource`). */
	SETTLEMENT_ACTIONS = 'settlement',
}

export enum Operation {
	FETCH_ORDER_LIST = 'fetchOrderList',
	FETCH_TRANSACTIONS_FOR_LINK = 'fetchTransactionsForLink',
	FETCH_PAYMENT_LINKS = 'fetchPaymentLinks',
	CREATE_PAYMENT_LINK = 'createPaymentLink',
	FETCH_REFUND_LIST = 'fetchRefundList',
	CHECK_REFUND_STATUS = 'checkRefundStatus',
	INITIATE_REFUND = 'initiateRefund',
	SETTLEMENT_TXN_LIST_BY_DATE = 'settlementTxnListByDate',
	SETTLEMENT_BILL_LIST = 'settlementBillList',
	ORDER_DETAIL = 'orderDetail',
	FETCH_SUBSCRIPTION_STATUS = 'fetchSubscriptionStatus',
	PAUSE_RESUME_SUBSCRIPTION = 'pauseResumeSubscription',
	CANCEL_SUBSCRIPTION = 'cancelSubscription',
}

export const ORDER_ACTIONS_OPERATIONS = [
	{
		name: 'Get',
		value: Operation.ORDER_DETAIL,
		description: 'Fetch order details',
		action: 'Get order details',
	},
	{
		name: 'Get Many',
		value: Operation.FETCH_ORDER_LIST,
		description: 'Fetch all orders',
		action: 'Get many orders',
	},
];

export const PAYMENTS_OPERATIONS = [
	{
		name: 'Create',
		value: Operation.CREATE_PAYMENT_LINK,
		description: 'Create and share a payment link',
		action: 'Create payment link',
	},
	{
		name: 'Get',
		value: Operation.FETCH_TRANSACTIONS_FOR_LINK,
		description: 'Fetch all transactions for a payment link',
		action: 'Get payment link',
	},
	{
		name: 'Get Many',
		value: Operation.FETCH_PAYMENT_LINKS,
		description: 'Fetch all payment links',
		action: 'Get many payment links',
	},
];

export const SUBSCRIPTION_OPERATIONS = [
	{
		name: 'Delete',
		value: Operation.CANCEL_SUBSCRIPTION,
		description: 'Cancel an active subscription',
		action: 'Cancel subscription',
	},
	{
		name: 'Get',
		value: Operation.FETCH_SUBSCRIPTION_STATUS,
		description: 'Fetch details and status of subscription',
		action: 'Get subscription status',
	},
	{
		name: 'Update',
		value: Operation.PAUSE_RESUME_SUBSCRIPTION,
		description: 'Pause or resume a subscription',
		action: 'Pause or resume subscription',
	},
];

export const REFUND_OPERATIONS = [
	{
		name: 'Create',
		value: Operation.INITIATE_REFUND,
		description: 'Initiate a full or partial refund',
		action: 'Create refund',
	},
	{
		name: 'Get',
		value: Operation.CHECK_REFUND_STATUS,
		description: 'Fetch refund status',
		action: 'Get refund status',
	},
	{
		name: 'Get Many',
		value: Operation.FETCH_REFUND_LIST,
		description: 'Fetch all refund requests',
		action: 'Get many refund requests',
	},
];

export const SETTLEMENT_OPERATIONS = [
	{
		name: 'Get Many',
		value: Operation.SETTLEMENT_BILL_LIST,
		description: 'Fetch all settlement details',
		action: 'Fetch all settlement details',
	},
	{
		name: 'Get Many Transactions',
		value: Operation.SETTLEMENT_TXN_LIST_BY_DATE,
		description: 'Fetch transaction level details for a settlement',
		action: 'Get many settlement transactions',
	},
];
