import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { requestAllFiles } from './helpers';
import { wrapData } from '../../../../utils/utilities';
import { apiRequest } from '../../transport';
import type { IAirtopResponse } from '../../transport/types';

const displayOptions = {
	show: {
		resource: ['file'],
		operation: ['getMany'],
	},
};

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions,
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['getMany'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 10,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Session IDs',
		name: 'sessionIds',
		type: 'string',
		default: '',
		description:
			'Comma-separated list of <a href="https://docs.airtop.ai/api-reference/airtop-api/sessions/create" target="_blank">Session IDs</a> to filter files by',
		placeholder: 'e.g. 980875c4-e12d,a302-f3dd51e',
		displayOptions,
	},
	{
		displayName: 'Wrap Output',
		name: 'wrapFilesInSingleItem',
		type: 'boolean',
		default: true,
		description: 'Whether to output a single item with all files or output one item per file',
		displayOptions,
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const returnAll = this.getNodeParameter('returnAll', index, false) as boolean;
	const limit = this.getNodeParameter('limit', index, 10);
	const sessionIds = this.getNodeParameter('sessionIds', index, '') as string;
	const wrapFilesInSingleItem = this.getNodeParameter(
		'wrapFilesInSingleItem',
		index,
		true,
	) as boolean;

	const endpoint = '/files';
	let files: IAirtopResponse[] = [];

	const responseData = returnAll
		? await requestAllFiles.call(this, sessionIds)
		: await apiRequest.call(this, 'GET', endpoint, {}, { sessionIds, limit });

	if (responseData.data?.files && Array.isArray(responseData.data?.files)) {
		files = responseData.data.files;
	}

	if (wrapFilesInSingleItem) {
		return this.helpers.returnJsonArray({ ...responseData });
	}

	return wrapData(files);
}
