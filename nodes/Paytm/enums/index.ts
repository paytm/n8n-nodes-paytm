export enum Resource {
	PAYMENTS = 'payments',
	ORDER_ACTIONS = 'orderActions',
	REFUND = 'refund',
	SUBSCRIPTION = 'subscription',
	/** Stored value remains `rtdd` for existing workflows. */
	SETTLEMENT_ACTIONS = 'rtdd',
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
	RTDD_BIZORDER_SEARCH = 'rtddBizorderSearch',
	INITIATE_SUBSCRIPTION = 'initiateSubscription',
	FETCH_SUBSCRIPTION_STATUS = 'fetchSubscriptionStatus',
	PAUSE_RESUME_SUBSCRIPTION = 'pauseResumeSubscription',
	CANCEL_SUBSCRIPTION = 'cancelSubscription',
}

export const ORDER_ACTIONS_OPERATIONS = [
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
		name: 'Get Many',
		value: Operation.FETCH_PAYMENT_LINKS,
		description: 'Fetch all payment links',
		action: 'Get many payment link details',
	},
	{
		name: 'Get Many Transactions',
		value: Operation.FETCH_TRANSACTIONS_FOR_LINK,
		description: 'Fetch all transactions against a payment links',
		action: 'Get many transactions for a payment link',
	},
];

export const SUBSCRIPTION_OPERATIONS = [
	{
		name: 'Cancel Subscription',
		value: Operation.CANCEL_SUBSCRIPTION,
		description: 'Cancel an active subscription',
		action: 'Cancel subscription',
	},
	{
		name: 'Fetch Subscription Status',
		value: Operation.FETCH_SUBSCRIPTION_STATUS,
		description: 'Look up subscription details by subsId, orderId, or linkId',
		action: 'Fetch subscription status',
	},
	{
		name: 'Initiate Subscription',
		value: Operation.INITIATE_SUBSCRIPTION,
		description: 'Create a recurring subscription',
		action: 'Initiate subscription',
	},
	{
		name: 'Pause or Resume Subscription',
		value: Operation.PAUSE_RESUME_SUBSCRIPTION,
		description: 'Pause (SUSPENDED) or resume (ACTIVE) a UPI Autopay subscription',
		action: 'Pause or resume subscription',
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
		name: 'Get',
		value: Operation.CHECK_REFUND_STATUS,
		description: 'Fetch refund status',
		action: 'Get a refund status',
	},
	{
		name: 'Get Many',
		value: Operation.FETCH_REFUND_LIST,
		description: 'Fetch all refund requests',
		action: 'Get many refund statuses',
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
		action: 'Get many settlement details',
	},
	{
		name: 'Get Order Level Settlement Details',
		value: Operation.ORDER_DETAIL,
		description: 'Fetch all details against an order',
		action: 'Get order level settlement details',
	},
	{
		name: 'Get Many Order Details',
		value: Operation.RTDD_BIZORDER_SEARCH,
		description: 'Fetch all details against an order ',
		action: 'Get transaction level settlement details',
	},
];
