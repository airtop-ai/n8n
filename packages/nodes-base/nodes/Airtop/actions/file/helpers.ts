import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Stream } from 'stream';

import { BASE_URL, ERROR_MESSAGES, OPERATION_TIMEOUT } from '../../constants';
import { apiRequest } from '../../transport';
import type { IAirtopResponseWithFiles } from '../../transport/types';

/**
 * Requests all files from the Airtop API with pagination of 100 files at a time
 * @param this - The execution context
 * @param sessionIds - The session IDs to filter files by
 * @returns A promise that resolves to the response data
 */
export async function requestAllFiles(
	this: IExecuteFunctions,
	sessionIds: string,
): Promise<IAirtopResponseWithFiles> {
	const endpoint = '/files';
	let hasMore = true;
	let currentOffset = 0;
	const limit = 100;
	const files: IAirtopResponseWithFiles['data']['files'] = [];
	let responseData: IAirtopResponseWithFiles;

	while (hasMore) {
		// request files
		responseData = (await apiRequest.call(
			this,
			'GET',
			endpoint,
			{},
			{ offset: currentOffset, limit, sessionIds },
		)) as IAirtopResponseWithFiles;
		// add files to the array
		if (responseData.data?.files && Array.isArray(responseData.data?.files)) {
			files.push(...responseData.data.files);
		}
		// check if there are more files
		hasMore = Boolean(responseData.data?.pagination?.hasMore);
		currentOffset += limit;
	}

	return {
		data: {
			files,
			pagination: {
				hasMore,
			},
		},
	};
}

/**
 * Polls until the file is available
 * @param this - The execution context
 * @param fileId - The ID of the file to poll
 * @param maxRetries - Maximum number of polling attempts
 * @param interval - Polling interval in milliseconds
 * @returns A promise that resolves to the file ID when the file is available
 */
export async function pollFileUntilAvailable(
	this: IExecuteFunctions,
	fileId: string,
	timeout = OPERATION_TIMEOUT,
	intervalSeconds = 1,
): Promise<string> {
	let fileStatus = '';
	const startTime = Date.now();

	while (fileStatus !== 'available') {
		const elapsedTime = Date.now() - startTime;
		if (elapsedTime >= timeout) {
			throw new NodeApiError(this.getNode(), {
				message: ERROR_MESSAGES.TIMEOUT_REACHED,
				code: 500,
			});
		}

		const response = await apiRequest.call(this, 'GET', `/files/${fileId}`);
		fileStatus = response.data?.status as string;

		// Wait before the next polling attempt
		await new Promise((resolve) => setTimeout(resolve, intervalSeconds * 1000));
	}

	return fileId;
}

/**
 * Creates a file entry, uploads the file, and waits until it's available
 * @param this - The execution context
 * @param fileName - Name of the file
 * @param fileBuffer - Buffer containing the file data
 * @param fileType - Type of the file (e.g., 'customer_upload')
 * @returns A promise that resolves to the file ID
 */
export async function createAndUploadFile(
	this: IExecuteFunctions,
	fileName: string,
	fileBuffer: Buffer,
	fileType: string,
	pollingFunction = pollFileUntilAvailable,
): Promise<string> {
	// Create file entry
	const createResponse = await apiRequest.call(this, 'POST', '/files', { fileName, fileType });

	const fileId = createResponse.data?.id;
	const uploadUrl = createResponse.data?.uploadUrl as string;

	if (!fileId || !uploadUrl) {
		throw new NodeApiError(this.getNode(), {
			message: 'Failed to create file entry: missing file ID or upload URL',
			code: 500,
		});
	}

	// Upload the file
	await this.helpers.httpRequest({
		method: 'PUT',
		url: uploadUrl,
		body: fileBuffer,
		headers: {
			'Content-Type': 'application/octet-stream',
		},
	});

	// Poll until the file is available
	return await pollingFunction.call(this, fileId as string);
}

export async function waitForFileInSession(
	this: IExecuteFunctions,
	sessionId: string,
	timeout = OPERATION_TIMEOUT,
): Promise<void> {
	const url = `${BASE_URL}/sessions/${sessionId}/events`;

	const fileReadyPromise = new Promise<void>(async (resolve) => {
		const stream = (await this.helpers.httpRequestWithAuthentication.call(this, 'airtopApi', {
			method: 'GET',
			url,
			encoding: 'stream',
		})) as Stream;

		// handle file upload events
		stream.on('data', (data: Uint8Array) => {
			const event = data.toString();
			const isFileUploadEvent = event.includes('"event":"file_upload_status"');
			const isFileAvailable = event.includes('"status":"available"');
			if (isFileUploadEvent && isFileAvailable) {
				resolve();
				stream.removeAllListeners();
			}
		});
	});

	const timeoutPromise = new Promise<void>((_resolve, reject) => {
		setTimeout(
			() =>
				reject(
					new NodeApiError(this.getNode(), {
						message: ERROR_MESSAGES.TIMEOUT_REACHED,
						code: 500,
					}),
				),
			timeout,
		);
	});

	await Promise.race([fileReadyPromise, timeoutPromise]);
}

/**
 * Pushes a file into a session and waits for the file to be ready
 * @param this - The execution context
 * @param fileId - ID of the file to push
 * @param sessionId - ID of the session to push the file to
 * @returns A promise that resolves to the file ID
 */
export async function pushFileToSession(
	this: IExecuteFunctions,
	fileId: string,
	sessionId: string,
	pollingFunction = waitForFileInSession,
): Promise<void> {
	// Push file into session
	await apiRequest.call(this, 'POST', `/files/${fileId}/push`, { sessionIds: [sessionId] });
	await pollingFunction.call(this, sessionId);
}

/**
 * Triggers the file input in a window
 * @param this - The execution context
 * @param fileId - ID of the file to input
 * @param windowId - ID of the window
 * @param sessionId - ID of the session
 * @returns A promise that resolves when the file input is triggered
 */
export async function triggerFileInput(
	this: IExecuteFunctions,
	fileId: string,
	windowId: string,
	sessionId: string,
): Promise<void> {
	await apiRequest.call(this, 'POST', `/sessions/${sessionId}/windows/${windowId}/file-input`, {
		fileId,
	});
}

/**
 * Creates a file Buffer from a URL or binary data
 * @param this - The execution context
 * @param source - Source type ('url' or 'binary')
 * @param value - URL string or binary data
 * @param itemIndex - Index of the item to get binary data from
 * @returns A promise that resolves to a Buffer
 */
export async function createFileBuffer(
	this: IExecuteFunctions,
	source: string,
	value: string,
	itemIndex: number,
): Promise<Buffer> {
	if (source === 'url') {
		// Return a Buffer from the URL
		const buffer = (await this.helpers.httpRequest({
			url: value,
			json: false,
			encoding: 'arraybuffer',
		})) as Buffer;

		return buffer;
	}

	if (source === 'binary') {
		// Get from binary data
		const binaryData = await this.helpers.getBinaryDataBuffer(itemIndex, value);
		return binaryData;
	}

	throw new NodeApiError(this.getNode(), {
		message: `Unsupported source type: ${source}. Please use 'url' or 'binary'`,
		code: 500,
	});
}
