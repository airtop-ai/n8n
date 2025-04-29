import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
} from 'n8n-workflow';

import { apiRequest } from '../../transport';
import type { IAirtopResponse } from '../../transport/types';

export const description: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: true,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['getMany'],
			},
		},
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
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Session IDs',
				name: 'sessionIds',
				type: 'string',
				default: '',
				description:
					'Comma-separated list of <a href="https://docs.airtop.ai/api-reference/airtop-api/sessions/create" target="_blank">Session IDs</a> to filter files by',
				placeholder: 'e.g. 980875c4-e12d,a302-f3dd51e',
			},
			{
				displayName: 'Return Files in a Single Item',
				name: 'returnSingleItem',
				type: 'boolean',
				default: false,
				description: 'Whether to return files as a single item or an array of items',
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	// const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const limit = this.getNodeParameter('limit', index, 10);
	const sessionIds = this.getNodeParameter('additionalFields.sessionIds', index, '') as string;

	const endpoint = '/files';
	let files: IAirtopResponse[] = [];
	// const qs: { offset?: number; limit?: number; sessionIds?: string[] } = {};

	// if (returnAll) {
	// 	let offset = 0;
	// 	let hasMore = true;

	// 	while (hasMore) {
	// 		qs.offset = offset;
	// 		qs.limit = limit;

	// 		const responseData = await apiRequest.call(this, 'GET', endpoint, undefined, qs);

	// 		if (responseData.data && Array.isArray(responseData.data)) {
	// 			files.push(...responseData.data);

	// 			// If we received fewer results than requested, we've reached the end
	// 			if (responseData.data.length < limit) {
	// 				hasMore = false;
	// 			} else {
	// 				offset += limit;
	// 			}
	// 		} else {
	// 			// No data or unexpected format
	// 			hasMore = false;
	// 		}
	// 	}
	// } else {
	// 	const limit = this.getNodeParameter('limit', index, 10);
	// 	qs.limit = limit;

	const responseData = await apiRequest.call(this, 'GET', endpoint, {}, { sessionIds, limit });

	if (responseData.data?.files && Array.isArray(responseData.data?.files)) {
		files = responseData.data.files;
	}
	// }

	// const itemData = generatePairedItemData(this.getInputData().length);

	return this.helpers.returnJsonArray({ files });
}
