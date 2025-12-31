/**
 * OpenAPI specification for News Data API
 */
export const openApiSpec = {
	openapi: "3.1.0",
	info: {
		title: "News Data API",
		version: "3.0.0",
		description: "Modular news aggregation API with AI-powered article transformation variants",
	},
	servers: [
		{
			url: "https://news-data.omc345.workers.dev",
			description: "Production server",
		},
	],
	paths: {
		"/health": {
			get: {
				summary: "Health check",
				description: "Check if the API is running",
				responses: {
					"200": {
						description: "API is healthy",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										status: { type: "string", example: "ok" },
										timestamp: { type: "string", example: "2025-12-31T19:00:00.000Z" },
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/articles": {
			get: {
				summary: "List articles",
				description: "Get a list of articles with optional filtering",
				parameters: [
					{
						name: "source",
						in: "query",
						description: "Filter by news source",
						schema: { type: "string", enum: ["hackernews", "t24", "eksisozluk", "wikipedia", "reddit"] },
					},
					{
						name: "limit",
						in: "query",
						description: "Maximum number of articles to return",
						schema: { type: "integer", default: 20 },
					},
				],
				responses: {
					"200": {
						description: "List of articles",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										articles: { type: "array" },
										count: { type: "integer" },
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/articles/{id}": {
			get: {
				summary: "Get article",
				description: "Get a single article by ID, optionally in a specific variant style",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						description: "Article ID",
						schema: { type: "string", example: "hackernews-46446815" },
					},
					{
						name: "variant",
						in: "query",
						description: "Transformation variant to fetch",
						schema: {
							type: "string",
							enum: ["raw", "default", "technical", "casual", "formal", "brief"],
							default: "raw",
						},
					},
				],
				responses: {
					"200": {
						description: "Article data",
					},
					"404": {
						description: "Article not found",
					},
				},
			},
		},
		"/api/articles/{id}/variants": {
			get: {
				summary: "List article variants",
				description: "Get all available transformation variants for an article",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						description: "Article ID",
						schema: { type: "string" },
					},
				],
				responses: {
					"200": {
						description: "List of available variants",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										articleId: { type: "string" },
										variants: {
											type: "array",
											items: { type: "string" },
										},
										count: { type: "integer" },
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/articles/{id}/variants/{variant}": {
			get: {
				summary: "Get specific variant",
				description: "Get a specific transformation variant of an article",
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						description: "Article ID",
						schema: { type: "string" },
					},
					{
						name: "variant",
						in: "path",
						required: true,
						description: "Variant name",
						schema: {
							type: "string",
							enum: ["raw", "default", "technical", "casual", "formal", "brief"],
						},
					},
				],
				responses: {
					"200": {
						description: "Article variant",
					},
				},
			},
		},
		"/api/admin/crawl": {
			post: {
				summary: "Crawl articles",
				description: "Manually trigger article crawling from news sources",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									sources: {
										type: "array",
										items: { type: "string" },
										description: "Array of source names",
										example: ["hackernews"],
									},
									count: {
										type: "integer",
										description: "Number of articles per source",
										default: 5,
										example: 2,
									},
									transform: {
										type: "boolean",
										description: "Whether to apply AI transformation",
										default: false,
									},
									variant: {
										type: "string",
										enum: ["default", "technical", "casual", "formal", "brief"],
										description: "Transformation variant if transform is true",
										default: "default",
									},
									sync: {
										type: "boolean",
										description: "Wait for completion or run in background",
										default: true,
									},
								},
								example: {
									sources: ["hackernews"],
									count: 2,
									transform: false,
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Crawl initiated successfully",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										success: { type: "boolean" },
										count: { type: "integer" },
										transformed: { type: "boolean" },
										variant: { type: "string" },
										status: { type: "string" },
										articles: { type: "array" },
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/admin/transform": {
			post: {
				summary: "Transform articles",
				description: "Apply AI transformation to existing articles with specific variant styles",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								oneOf: [
									{
										description: "Transform single article",
										properties: {
											articleId: { type: "string", example: "hackernews-46446815" },
											variant: {
												type: "string",
												enum: ["default", "technical", "casual", "formal", "brief"],
												default: "default",
											},
											variants: {
												type: "array",
												items: {
													type: "string",
													enum: ["default", "technical", "casual", "formal", "brief"],
												},
												description: "Generate multiple variants",
											},
										},
										example: {
											articleId: "hackernews-46446815",
											variants: ["default", "technical", "brief"],
										},
									},
									{
										description: "Batch transform by source",
										properties: {
											source: { type: "string", example: "hackernews" },
											limit: { type: "integer", default: 10 },
											variant: { type: "string", default: "default" },
										},
									},
								],
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Transformation successful",
					},
				},
			},
		},
		"/api/admin/clean": {
			post: {
				summary: "Clean storage",
				description: "Clear KV indexes (articles remain in R2)",
				responses: {
					"200": {
						description: "Storage cleaned successfully",
					},
				},
			},
		},
		"/api/admin/providers": {
			get: {
				summary: "List providers",
				description: "Get all available and enabled news providers",
				responses: {
					"200": {
						description: "List of providers",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										all: { type: "array", items: { type: "string" } },
										enabled: { type: "array", items: { type: "string" } },
									},
								},
							},
						},
					},
				},
			},
		},
		"/api/subscriptions": {
			post: {
				summary: "Subscribe to push notifications",
				description: "Subscribe to receive push notifications for new articles",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								description: "Push subscription object",
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Subscription created",
					},
				},
			},
		},
		"/api/subscriptions/count": {
			get: {
				summary: "Get subscription count",
				description: "Get the number of active push subscriptions",
				responses: {
					"200": {
						description: "Subscription count",
					},
				},
			},
		},
		"/api/subscriptions/test": {
			post: {
				summary: "Test push notification",
				description: "Send a test push notification to all subscribers",
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									title: { type: "string", example: "Test Notification" },
									message: { type: "string", example: "This is a test" },
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Test notifications sent",
					},
				},
			},
		},
	},
};
