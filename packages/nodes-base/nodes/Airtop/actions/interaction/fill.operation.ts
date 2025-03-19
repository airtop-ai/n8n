import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	NodeApiError,
} from 'n8n-workflow';

import {
	validateRequiredStringField,
	validateSessionAndWindowId,
	validateAirtopApiResponse,
} from '../../GenericFunctions';
import { apiRequest } from '../../transport';
import { IAirtopResponse } from '../../transport/types';
import { ERROR_MESSAGES } from '../../constants';

export const description: INodeProperties[] = [
	{
		displayName: 'Form Data',
		name: 'formData',
		type: 'string',
		typeOptions: {
			rows: 4,
		},
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['fill'],
			},
		},
		description: 'The information to fill into the form written in natural language',
		hint: 'e.g. "Name: John Doe, Email: john.doe@example.com, Phone: +1234567890"',
	},
	{
		displayName: 'Timeout',
		name: 'timeout',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 180,
		},
		default: 30,
		description: 'The timeout in seconds for the operation to complete',
		displayOptions: {
			show: {
				resource: ['interaction'],
				operation: ['fill'],
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const { sessionId, windowId } = validateSessionAndWindowId.call(this, index);
	const formData = validateRequiredStringField.call(this, index, 'formData', 'Form Data');
	const timeout = this.getNodeParameter('timeout', index, 1) as number;

	const asyncAutomationResponse = await apiRequest.call(
		this,
		'POST',
		`/async/sessions/${sessionId}/windows/${windowId}/execute-automation`,
		{
			automationId: 'auto',
			parameters: {
				customData: formData,
			},
		},
	);

	const reqId = asyncAutomationResponse.requestId;
	let automationStatusResponse: IAirtopResponse;

	// Poll status every second until it's completed or timeout is reached
	const timeoutMs = timeout * 1000;
	const startTime = Date.now();

	while (true) {
		automationStatusResponse = await apiRequest.call(this, 'GET', `/requests/${reqId}/status`);
		const status = automationStatusResponse?.status ?? '';

		validateAirtopApiResponse(this.getNode(), automationStatusResponse);

		if (status === 'completed' || status === 'error') {
			break;
		}

		const elapsedTime = Date.now() - startTime;
		if (elapsedTime >= timeoutMs) {
			throw new NodeApiError(this.getNode(), {
				message: ERROR_MESSAGES.TIMEOUT_REACHED,
				code: 500,
			});
		}

		// Wait one second
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	return this.helpers.returnJsonArray({ sessionId, windowId, ...automationStatusResponse });
}
