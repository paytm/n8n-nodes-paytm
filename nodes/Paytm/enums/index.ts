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
		name: 'Fetch All',
		value: Operation.FETCH_ORDER_LIST,
		description: 'Fetch all orders',
		action: 'Fetch all orders',
	},
	{
		name: 'Fetch',
		value: Operation.ORDER_DETAIL,
		description: 'Fetch order details',
		action: 'Fetch order details',
	},
];

export const PAYMENTS_OPERATIONS = [
	{
		name: 'Create',
		value: Operation.CREATE_PAYMENT_LINK,
		description: 'Create and share a payment link',
		action: 'Create a payment link',
	},
	{
		name: 'Fetch',
		value: Operation.FETCH_TRANSACTIONS_FOR_LINK,
		description: 'Fetch payment link details',
		action: 'Fetch a payment link',
	},
	{
		name: 'Fetch All',
		value: Operation.FETCH_PAYMENT_LINKS,
		description: 'Fetch all payment links',
		action: 'Fetch all payment links',
	},
];

export const SUBSCRIPTION_OPERATIONS = [
	{
		name: 'Cancel',
		value: Operation.CANCEL_SUBSCRIPTION,
		description: 'Cancel an active subscription',
		action: 'Cancel a subscription',
	},
	{
		name: 'Fetch',
		value: Operation.FETCH_SUBSCRIPTION_STATUS,
		description: 'Fetch details and status of subscription',
		action: 'Fetch a subscription',
	},
	{
		name: 'Pause or Resume',
		value: Operation.PAUSE_RESUME_SUBSCRIPTION,
		description: 'Pause or resume a subscription',
		action: 'Pause or resume a subscription',
	},
];

export const REFUND_OPERATIONS = [
	{
		name: 'Create',
		value: Operation.INITIATE_REFUND,
		description: 'Initiate a full or partial refund',
		action: 'Create a refund',
	},
	{
		name: 'Fetch',
		value: Operation.CHECK_REFUND_STATUS,
		description: 'Fetch refund status',
		action: 'Fetch a refund',
	},
	{
		name: 'Fetch All',
		value: Operation.FETCH_REFUND_LIST,
		description: 'Fetch all refund requests',
		action: 'Fetch all refunds',
	},
];

export const SETTLEMENT_OPERATIONS = [
	{
		name: 'Fetch All Transactions',
		value: Operation.SETTLEMENT_TXN_LIST_BY_DATE,
		description: 'Fetch transaction level details for a settlement',
		action: 'Fetch all settlement transactions',
	},
	{
		name: 'Fetch All',
		value: Operation.SETTLEMENT_BILL_LIST,
		description: 'Fetch all settlement details',
		action: 'Fetch all settlements',
	},
];
