import type { INodeProperties } from 'n8n-workflow';

import * as getMany from './getMany.operation';

export { getMany };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get a list of files',
				action: 'Get many files',
			},
		],
		default: 'getMany',
	},
	...getMany.description,
];
