import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	createAndUploadFile,
	pushFileToSession,
	triggerFileInput,
	createFileBuffer,
} from './helpers';
import { validateRequiredStringField } from '../../GenericFunctions';
import { sessionIdField, windowIdField } from '../common/fields';

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['upload'],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		required: true,
		description: 'Name for the file',
		displayOptions,
	},
	{
		displayName: 'File Type',
		name: 'fileType',
		type: 'options',
		options: [
			{
				name: 'Browser Download',
				value: 'browser_download',
			},
			{
				name: 'Screenshot',
				value: 'screenshot',
			},
			{
				name: 'Video',
				value: 'video',
			},
			{
				name: 'Customer Upload',
				value: 'customer_upload',
			},
		],
		default: 'customer_upload',
		description: "Choose the type of file to upload. Defaults to 'Customer Upload'.",
		displayOptions,
	},
	{
		displayName: 'Source',
		name: 'source',
		type: 'options',
		options: [
			{
				name: 'URL',
				value: 'url',
			},
			{
				name: 'Binary',
				value: 'binary',
			},
		],
		default: 'url',
		description: 'Source of the file to upload',
		displayOptions,
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				source: ['binary'],
				...displayOptions.show,
			},
		},
		description: 'Name of the binary property containing the file data',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				source: ['url'],
				...displayOptions.show,
			},
		},
		description: 'URL from where to fetch the file to upload',
	},
	{
		displayName: 'Load File',
		name: 'loadFile',
		type: 'boolean',
		default: false,
		description: 'Whether to load the file into the session',
		displayOptions,
	},
	{
		...sessionIdField,
		description: 'The session ID to load the file into',
		displayOptions: {
			show: {
				loadFile: [true],
				...displayOptions.show,
			},
		},
	},
	{
		...windowIdField,
		description: 'The window ID to trigger the file input in',
		displayOptions: {
			show: {
				loadFile: [true],
				...displayOptions.show,
			},
		},
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const fileName = this.getNodeParameter('fileName', index, '') as string;
	const fileType = this.getNodeParameter('fileType', index, 'customer_upload') as string;
	const source = this.getNodeParameter('source', index, 'url') as string;
	const url = this.getNodeParameter('url', index, '') as string;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', index, '');
	const loadFile = this.getNodeParameter('loadFile', index, false) as boolean;

	const sessionId = loadFile
		? validateRequiredStringField.call(this, index, 'sessionId', 'Session ID')
		: '';

	const windowId = loadFile
		? validateRequiredStringField.call(this, index, 'windowId', 'Window ID')
		: '';

	// Get the file content based on source type
	const fileValue = source === 'url' ? url : binaryPropertyName;

	try {
		const fileBuffer = await createFileBuffer.call(this, source, fileValue, index);
		const fileId = await createAndUploadFile.call(this, fileName, fileBuffer, fileType);

		if (loadFile) {
			await pushFileToSession.call(this, fileId, sessionId);
			await triggerFileInput.call(this, fileId, windowId, sessionId);
		}

		return this.helpers.returnJsonArray({
			...(sessionId ? { sessionId } : {}),
			...(windowId ? { windowId } : {}),
			data: {
				fileId,
				message: 'File uploaded successfully',
			},
		});
	} catch (error) {
		throw new NodeOperationError(this.getNode(), error as Error);
	}
}
