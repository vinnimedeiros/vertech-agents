export type WhatsAppInstanceStatus =
	| "PENDING"
	| "CONNECTING"
	| "CONNECTED"
	| "DISCONNECTED"
	| "LOGGED_OUT"
	| "ERROR";

export type ParsedMessage =
	| { type: "TEXT"; text: string }
	| {
			type: "IMAGE";
			mediaUrl: string;
			mediaMimeType: string;
			mediaFileName: string;
			mediaSize: number;
			caption: string | null;
	  }
	| {
			type: "AUDIO";
			mediaUrl: string;
			mediaMimeType: string;
			mediaFileName: string;
			mediaSize: number;
			durationSeconds: number;
	  }
	| {
			type: "VIDEO";
			mediaUrl: string;
			mediaMimeType: string;
			mediaFileName: string;
			mediaSize: number;
			durationSeconds: number;
			caption: string | null;
	  }
	| {
			type: "DOCUMENT";
			mediaUrl: string;
			mediaMimeType: string;
			mediaFileName: string;
			mediaSize: number;
	  }
	| {
			type: "STICKER";
			mediaUrl: string;
			mediaMimeType: string;
			mediaFileName: string;
			mediaSize: number;
	  }
	| {
			type: "LOCATION";
			text: string;
			metadata: {
				latitude: number | null | undefined;
				longitude: number | null | undefined;
				name: string | null | undefined;
				address: string | null | undefined;
			};
	  }
	| {
			type: "UNSUPPORTED";
			text: string;
	  };
