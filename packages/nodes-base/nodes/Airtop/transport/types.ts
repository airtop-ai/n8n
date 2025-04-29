import type { IDataObject, INodeExecutionData } from 'n8n-workflow';

export interface IAirtopResponse extends IDataObject {
	sessionId?: string;
	windowId?: string;
	data?: {
		windowId?: string;
		modelResponse?: string;
	};
	meta?: IDataObject & {
		status?: string;
		screenshots?: Array<{ dataUrl: string }>;
	};
	errors?: IDataObject[];
	warnings?: IDataObject[];
	output?: IDataObject;
}

export interface IAirtopInteractionRequest extends IDataObject {
	text?: string;
	waitForNavigation?: boolean;
	elementDescription?: string;
	pressEnterKey?: boolean;
	// scroll parameters
	scrollToElement?: string;
	scrollWithin?: string;
	scrollToEdge?: {
		xAxis?: string;
		yAxis?: string;
	};
	scrollBy?: {
		xAxis?: string;
		yAxis?: string;
	};
	// configuration
	configuration: {
		visualAnalysis?: {
			scope: string;
		};
		waitForNavigationConfig?: {
			waitUntil: string;
		};
	};
}

export interface IAirtopNodeExecutionData extends INodeExecutionData {
	json: IAirtopResponse;
}
