import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { pushFileToSession, triggerFileInput } from './helpers';
import { sessionIdField, windowIdField } from '../common/fields';

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['load'],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'File ID',
		name: 'fileId',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the file to load into the session',
		displayOptions,
	},
	{
		...sessionIdField,
		description: 'The session ID to load the file into',
		displayOptions,
	},
	{
		...windowIdField,
		description: 'The window ID to trigger the file input in',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const fileId = this.getNodeParameter('fileId', index, '') as string;
	const sessionId = this.getNodeParameter('sessionId', index, '') as string;
	const windowId = this.getNodeParameter('windowId', index, '') as string;

	try {
		await pushFileToSession.call(this, fileId, sessionId);
		await triggerFileInput.call(this, fileId, windowId, sessionId);

		return this.helpers.returnJsonArray({
			sessionId,
			windowId,
			data: {
				message: 'File loaded successfully',
			},
		});
	} catch (error) {
		throw new NodeOperationError(this.getNode(), error as Error);
	}
}
