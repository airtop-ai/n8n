import nock from 'nock';

import * as getPaginated from '../../../actions/extraction/getPaginated.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as GenericFunctions from '../../../GenericFunctions';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'extraction',
	operation: 'getPaginated',
	sessionId: 'test-session-123',
	windowId: 'win-123',
	sessionMode: 'existing',
};

const mockResponse = {
	data: {
		modelResponse:
			'{"items": [{"title": "Item 1", "price": "$10.99"}, {"title": "Item 2", "price": "$20.99"}]}',
	},
};

const mockJsonSchema =
	'{"type":"object","properties":{"title":{"type":"string"},"price":{"type":"string"}}}';

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async (method: string, endpoint: string) => {
			// For paginated extraction requests
			if (endpoint.includes('/paginated-extraction')) {
				return mockResponse;
			}

			// For session deletion
			if (method === 'DELETE' && endpoint.includes('/sessions/')) {
				return { status: 'success' };
			}

			return { success: true };
		}),
	};
});

jest.mock('../../../GenericFunctions', () => {
	const originalModule = jest.requireActual<typeof GenericFunctions>('../../../GenericFunctions');
	return {
		...originalModule,
		createSessionAndWindow: jest.fn().mockImplementation(async () => {
			return {
				sessionId: 'new-session-123',
				windowId: 'new-window-123',
			};
		}),
		shouldCreateNewSession: jest.fn().mockImplementation(function (this: any, index: number) {
			const sessionMode = this.getNodeParameter('sessionMode', index);
			return sessionMode === 'new';
		}),
		validateAirtopApiResponse: jest.fn(),
	};
});

describe('Test Airtop, getPaginated operation', () => {
	beforeAll(() => {
		nock.disableNetConnect();
	});

	afterAll(() => {
		nock.restore();
		jest.unmock('../../../transport');
		jest.unmock('../../../GenericFunctions');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should extract data with minimal parameters', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			prompt: 'Extract all product titles and prices',
		};

		const result = await getPaginated.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).not.toHaveBeenCalled();
		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/paginated-extraction',
			{
				prompt: 'Extract all product titles and prices',
				configuration: {},
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					data: mockResponse.data,
				},
			},
		]);
	});

	it('should extract data with output schema', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			prompt: 'Extract all product titles and prices',
			additionalFields: {
				outputSchema: mockJsonSchema,
			},
		};

		const result = await getPaginated.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).not.toHaveBeenCalled();
		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/win-123/paginated-extraction',
			{
				prompt: 'Extract all product titles and prices',
				configuration: {
					outputSchema: mockJsonSchema,
				},
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'win-123',
					data: mockResponse.data,
				},
			},
		]);
	});

	it("should extract data creating a new session with 'sessionMode' equals 'new'", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionMode: 'new',
			url: 'https://example.com',
			prompt: 'Extract all product titles and prices',
		};

		const result = await getPaginated.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(GenericFunctions.shouldCreateNewSession).toHaveBeenCalledTimes(1);
		expect(GenericFunctions.createSessionAndWindow).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledTimes(1);
		expect(transport.apiRequest).toHaveBeenCalledWith(
			'POST',
			'/sessions/new-session-123/windows/new-window-123/paginated-extraction',
			{
				prompt: 'Extract all product titles and prices',
				configuration: {},
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'new-session-123',
					windowId: 'new-window-123',
					data: mockResponse.data,
				},
			},
		]);
	});

	it("should throw error when 'sessionId' is empty in 'existing' session mode", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
			prompt: 'Extract data',
		};

		await expect(
			getPaginated.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.SESSION_ID_REQUIRED);
	});

	it("should throw error when 'windowId' is empty in 'existing' session mode", async () => {
		const nodeParameters = {
			...baseNodeParameters,
			windowId: '',
			prompt: 'Extract data',
		};

		await expect(
			getPaginated.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.WINDOW_ID_REQUIRED);
	});
});
