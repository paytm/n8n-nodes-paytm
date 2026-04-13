import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { NODE_CONFIG } from './constants';
import {
	Operation,
	ORDER_ACTIONS_OPERATIONS,
	PAYMENTS_OPERATIONS,
	REFUND_OPERATIONS,
	Resource,
	SETTLEMENT_OPERATIONS,
	SUBSCRIPTION_OPERATIONS,
} from './enums';
import {
	checkRefundStatusDescription,
	executeCheckRefundStatus,
	createPaymentLinkDescription,
	executeCreatePaymentLink,
	fetchOrderListDescription,
	executeFetchOrderList,
	fetchPaymentLinksDescription,
	executeFetchPaymentLinks,
	fetchRefundListDescription,
	executeFetchRefundList,
	fetchTransactionsForLinkDescription,
	executeFetchTransactionsForLink,
	initiateRefundDescription,
	executeInitiateRefund,
	orderDetailDescription,
	executeOrderDetail,
	rtddBizorderSearchDescription,
	executeRtddBizorderSearch,
	settlementBillListDescription,
	executeSettlementBillList,
	settlementTxnListByDateDescription,
	executeSettlementTxnListByDate,
	initiateSubscriptionDescription,
	executeInitiateSubscription,
	fetchSubscriptionStatusDescription,
	executeFetchSubscriptionStatus,
	pauseResumeSubscriptionDescription,
	executePauseResumeSubscription,
	cancelSubscriptionDescription,
	executeCancelSubscription,
} from './operations';
import { paytmApiCredentialTest } from './utils/paytmCredentialTest';

export class Paytm implements INodeType {
	description: INodeTypeDescription = {
		displayName: NODE_CONFIG.DISPLAY_NAME,
		name: NODE_CONFIG.NAME,
		icon: NODE_CONFIG.ICON as unknown as INodeTypeDescription['icon'],
		group: NODE_CONFIG.GROUP as INodeTypeDescription['group'],
		version: NODE_CONFIG.VERSION,
		description: NODE_CONFIG.DESCRIPTION,
		documentationUrl: NODE_CONFIG.DOCUMENTATION_URL,
		defaults: {
			name: 'Paytm',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: NODE_CONFIG.CREDENTIAL_NAME,
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				default: Resource.ORDER_ACTIONS,
				noDataExpression: true,
				options: [
					{
						name: 'Order',
						value: Resource.ORDER_ACTIONS,
						},
					{
						name: 'Payment Link',
						value: Resource.PAYMENTS,
						},
					{
						name: 'Refund',
						value: Resource.REFUND,
						},
					{
						name: 'Settlement',
						value: Resource.SETTLEMENT_ACTIONS,
					},
					{
						name: 'Subscription',
						value: Resource.SUBSCRIPTION,
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: Operation.FETCH_ORDER_LIST,
				displayOptions: {
					show: {
						resource: [Resource.ORDER_ACTIONS],
					},
				},
				noDataExpression: true,
				options: ORDER_ACTIONS_OPERATIONS,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: Operation.FETCH_TRANSACTIONS_FOR_LINK,
				displayOptions: {
					show: {
						resource: [Resource.PAYMENTS],
					},
				},
				noDataExpression: true,
				options: PAYMENTS_OPERATIONS,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: Operation.FETCH_REFUND_LIST,
				displayOptions: {
					show: {
						resource: [Resource.REFUND],
					},
				},
				noDataExpression: true,
				options: REFUND_OPERATIONS,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: Operation.FETCH_SUBSCRIPTION_STATUS,
				displayOptions: {
					show: {
						resource: [Resource.SUBSCRIPTION],
					},
				},
				noDataExpression: true,
				options: SUBSCRIPTION_OPERATIONS,
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				default: Operation.SETTLEMENT_TXN_LIST_BY_DATE,
				displayOptions: {
					show: {
						resource: [Resource.SETTLEMENT_ACTIONS],
					},
				},
				noDataExpression: true,
				options: SETTLEMENT_OPERATIONS,
			},
			...fetchOrderListDescription,
			...fetchTransactionsForLinkDescription,
			...fetchPaymentLinksDescription,
			...createPaymentLinkDescription,
			...fetchRefundListDescription,
			...checkRefundStatusDescription,
			...initiateRefundDescription,
			...initiateSubscriptionDescription,
			...fetchSubscriptionStatusDescription,
			...pauseResumeSubscriptionDescription,
			...cancelSubscriptionDescription,
			...settlementTxnListByDateDescription,
			...settlementBillListDescription,
			...orderDetailDescription,
			...rtddBizorderSearchDescription,
		],
	};

	methods = {
		credentialTest: {
			paytmApiCredentialTest,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				let result: unknown;

				switch (operation) {
					case Operation.FETCH_ORDER_LIST:
						result = await executeFetchOrderList.call(this, itemIndex);
						break;
					case Operation.FETCH_TRANSACTIONS_FOR_LINK:
						result = await executeFetchTransactionsForLink.call(this, itemIndex);
						break;
					case Operation.FETCH_PAYMENT_LINKS:
						result = await executeFetchPaymentLinks.call(this, itemIndex);
						break;
					case Operation.CREATE_PAYMENT_LINK:
						result = await executeCreatePaymentLink.call(this, itemIndex);
						break;
					case Operation.FETCH_REFUND_LIST:
						result = await executeFetchRefundList.call(this, itemIndex);
						break;
					case Operation.CHECK_REFUND_STATUS:
						result = await executeCheckRefundStatus.call(this, itemIndex);
						break;
					case Operation.INITIATE_REFUND:
						result = await executeInitiateRefund.call(this, itemIndex);
						break;
					case Operation.INITIATE_SUBSCRIPTION:
						result = await executeInitiateSubscription.call(this, itemIndex);
						break;
					case Operation.FETCH_SUBSCRIPTION_STATUS:
						result = await executeFetchSubscriptionStatus.call(this, itemIndex);
						break;
					case Operation.PAUSE_RESUME_SUBSCRIPTION:
						result = await executePauseResumeSubscription.call(this, itemIndex);
						break;
					case Operation.CANCEL_SUBSCRIPTION:
						result = await executeCancelSubscription.call(this, itemIndex);
						break;
					case Operation.SETTLEMENT_TXN_LIST_BY_DATE:
						result = await executeSettlementTxnListByDate.call(this, itemIndex);
						break;
					case Operation.SETTLEMENT_BILL_LIST:
						result = await executeSettlementBillList.call(this, itemIndex);
						break;
					case Operation.ORDER_DETAIL:
						result = await executeOrderDetail.call(this, itemIndex);
						break;
					case Operation.RTDD_BIZORDER_SEARCH:
						result = await executeRtddBizorderSearch.call(this, itemIndex);
						break;
					default:
						throw new ApplicationError(`Unknown operation: ${operation}`);
				}

				returnData.push({
					json: result as IDataObject,
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
							operation: this.getNodeParameter('operation', itemIndex),
							timestamp: new Date().toISOString(),
						},
						pairedItem: { item: itemIndex },
					});
				} else {
					throw new NodeOperationError(this.getNode(), error as Error, {
						itemIndex,
					});
				}
			}
		}

		return [returnData];
	}
}
