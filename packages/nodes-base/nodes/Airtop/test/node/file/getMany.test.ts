import * as getMany from '../../../actions/file/getMany.operation';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'file',
	operation: 'getMany',
	returnAll: true,
	options: {},
};

const mockFileResponse = {
	data: [
		{
			id: 'file-123',
			fileName: 'test-file.pdf',
			fileType: 'customer_upload',
			fileBytes: 12345,
			status: 'available',
		},
		{
			id: 'file-456',
			fileName: 'screenshot.png',
			fileType: 'screenshot',
			fileBytes: 6789,
			status: 'available',
		},
	],
	meta: {
		requestId: 'req-123',
	},
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async function () {
			return mockFileResponse;
		}),
	};
});

describe('Test Airtop, file getMany operation', () => {
	afterAll(() => {
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should get files with returnAll=true', async () => {
		const result = await getMany.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', '/files', undefined, {
			offset: 0,
			limit: 10,
		});

		expect(result).toEqual([
			{
				json: mockFileResponse.data[0],
				pairedItem: {
					item: 0,
				},
			},
			{
				json: mockFileResponse.data[1],
				pairedItem: {
					item: 0,
				},
			},
		]);
	});

	it('should get files with limit', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			returnAll: false,
			limit: 5,
		};

		const result = await getMany.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', '/files', undefined, {
			limit: 5,
		});

		expect(result).toEqual([
			{
				json: mockFileResponse.data[0],
				pairedItem: {
					item: 0,
				},
			},
			{
				json: mockFileResponse.data[1],
				pairedItem: {
					item: 0,
				},
			},
		]);
	});

	it('should get files with sessionIds', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			options: {
				sessionIds: 'session-123,session-456',
			},
		};

		const result = await getMany.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith('GET', '/files', undefined, {
			offset: 0,
			limit: 10,
			sessionIds: ['session-123', 'session-456'],
		});

		expect(result).toEqual([
			{
				json: mockFileResponse.data[0],
				pairedItem: {
					item: 0,
				},
			},
			{
				json: mockFileResponse.data[1],
				pairedItem: {
					item: 0,
				},
			},
		]);
	});
});
