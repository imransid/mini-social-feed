/**
 * Hand-written OpenAPI 3.0 description of the API.
 *
 * Documentation only — this file is never imported by a route, controller, or
 * service. Every path, validation limit, and status code here was taken from
 * the corresponding source file; keep them in step when routes change.
 */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Mini Social Feed API",
    version: "1.0.0",
    description:
      "REST API for the Mini Social Feed app: accounts, posts, likes, " +
      "comments, and FCM device registration.\n\n" +
      "All endpoints except `/health`, `/auth/signup` and `/auth/login` " +
      "require a JWT. Obtain one from signup or login, then press " +
      "**Authorize** and paste the token.",
  },
  // Production first: the deployed /docs page is the common entry point, and
  // Swagger preselects the first entry for "Try it out".
  servers: [
    {
      url: "https://mini-social-feed-production.up.railway.app",
      description: "Production",
    },
    { url: "http://localhost:4000", description: "Local development" },
  ],
  tags: [
    { name: "Health", description: "Liveness probe" },
    { name: "Auth", description: "Account creation and login" },
    { name: "Posts", description: "Create and browse the feed" },
    { name: "Interactions", description: "Likes and comments" },
    { name: "Devices", description: "Push notification token registration" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Paste only the token itself — Swagger UI adds the `Bearer ` prefix.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        description:
          "Every error response in the API uses this shape, including 404s " +
          "for unknown routes and 400s for malformed JSON.",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "string",
                description: "Stable machine-readable identifier.",
                enum: [
                  "VALIDATION_ERROR",
                  "INVALID_JSON",
                  "UNAUTHORIZED",
                  "INVALID_CREDENTIALS",
                  "USERNAME_TAKEN",
                  "POST_NOT_FOUND",
                  "NOT_FOUND",
                  "INTERNAL",
                ],
              },
              message: {
                type: "string",
                description: "Human-readable explanation.",
              },
            },
          },
        },
        example: {
          error: { code: "VALIDATION_ERROR", message: "Too small: expected string to have >=3 characters" },
        },
      },
      User: {
        type: "object",
        required: ["id", "username"],
        properties: {
          id: { type: "string", format: "uuid" },
          username: { type: "string" },
        },
      },
      AuthResponse: {
        type: "object",
        required: ["token", "user"],
        properties: {
          token: { type: "string", description: "Signed JWT." },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      Credentials: {
        type: "object",
        required: ["username", "password"],
        properties: {
          username: { type: "string", minLength: 3, maxLength: 30 },
          password: { type: "string", minLength: 6, maxLength: 100 },
        },
        example: { username: "alice", password: "secret123" },
      },
      Pagination: {
        type: "object",
        required: ["page", "limit", "total", "pages"],
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          total: { type: "integer", example: 42 },
          pages: { type: "integer", example: 5 },
        },
      },
      CreatedPost: {
        type: "object",
        description: "Returned by POST /posts.",
        properties: {
          id: { type: "string", format: "uuid" },
          content: { type: "string" },
          authorId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          author: { $ref: "#/components/schemas/User" },
        },
      },
      FeedPost: {
        type: "object",
        description: "Returned by GET /posts.",
        properties: {
          id: { type: "string", format: "uuid" },
          content: { type: "string" },
          author: { $ref: "#/components/schemas/User" },
          likeCount: { type: "integer" },
          commentCount: { type: "integer" },
          likedByMe: {
            type: "boolean",
            description: "Whether the authenticated caller has liked this post.",
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Feed: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/FeedPost" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      Comment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          content: { type: "string" },
          postId: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
          author: { $ref: "#/components/schemas/User" },
        },
      },
      CommentList: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Comment" },
          },
          pagination: { $ref: "#/components/schemas/Pagination" },
        },
      },
      LikeResult: {
        type: "object",
        required: ["liked", "likeCount"],
        properties: {
          liked: {
            type: "boolean",
            description: "State after the toggle: true if now liked.",
          },
          likeCount: {
            type: "integer",
            description: "Total likes on the post after the toggle.",
          },
        },
      },
      Device: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          fcmToken: { type: "string" },
          userId: { type: "string", format: "uuid" },
        },
      },
    },
    parameters: {
      PostId: {
        name: "id",
        in: "path",
        required: true,
        description: "Post id.",
        schema: { type: "string", format: "uuid" },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing, malformed, or expired token.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: { error: { code: "UNAUTHORIZED", message: "Missing token" } },
          },
        },
      },
      ValidationError: {
        description: "Request body failed validation, or was not valid JSON.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      PostNotFound: {
        description: "No post exists with that id.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
            example: {
              error: { code: "POST_NOT_FOUND", message: "Post not found" },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness probe",
        security: [],
        responses: {
          "200": {
            description: "Service is up.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string", example: "ok" } },
                },
              },
            },
          },
        },
      },
    },

    "/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Create an account",
        description:
          "Creates a user and returns a JWT. Usernames are unique.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Credentials" },
            },
          },
        },
        responses: {
          "201": {
            description: "Account created.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "409": {
            description: "Username already registered.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: {
                  error: {
                    code: "USERNAME_TAKEN",
                    message: "Username already exists",
                  },
                },
              },
            },
          },
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        description:
          "A wrong password and an unknown username return an identical " +
          "response, so the API does not disclose whether an account exists.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Credentials" },
            },
          },
        },
        responses: {
          "200": {
            description: "Authenticated.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": {
            description: "Wrong username or password.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" },
                example: {
                  error: {
                    code: "INVALID_CREDENTIALS",
                    message: "Wrong username or password",
                  },
                },
              },
            },
          },
        },
      },
    },

    "/posts": {
      post: {
        tags: ["Posts"],
        summary: "Create a post",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string", minLength: 1, maxLength: 500 },
                },
                example: { content: "hello feed" },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Post created.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreatedPost" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      get: {
        tags: ["Posts"],
        summary: "List the feed",
        description: "Newest first. `likedByMe` is relative to the caller.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            required: false,
            description: "1-based page number. Values below 1 are clamped to 1.",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Page size. Clamped to a maximum of 50.",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 10 },
          },
          {
            name: "username",
            in: "query",
            required: false,
            description: "Only return posts authored by this exact username.",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "A page of the feed.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Feed" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    "/posts/{id}/like": {
      post: {
        tags: ["Interactions"],
        summary: "Toggle a like",
        description:
          "Toggles: the first call likes, the second unlikes. Idempotent — " +
          "liking twice leaves no like and never a duplicate row, enforced by " +
          "a unique constraint on (postId, userId). Takes no request body.",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/PostId" }],
        responses: {
          "200": {
            description: "Like state after the toggle.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LikeResult" },
                example: { liked: true, likeCount: 1 },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/PostNotFound" },
        },
      },
    },

    "/posts/{id}/comment": {
      post: {
        tags: ["Interactions"],
        summary: "Add a comment",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/PostId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string", minLength: 1, maxLength: 300 },
                },
                example: { content: "nice post" },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Comment created.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Comment" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/PostNotFound" },
        },
      },
    },

    "/posts/{id}/comments": {
      get: {
        tags: ["Interactions"],
        summary: "List a post's comments",
        description: "Oldest first, so a thread reads top to bottom.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/PostId" },
          {
            name: "page",
            in: "query",
            required: false,
            description: "1-based page number. Values below 1 are clamped to 1.",
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Page size. Clamped to a maximum of 50.",
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
        ],
        responses: {
          "200": {
            description: "A page of comments.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CommentList" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/PostNotFound" },
        },
      },
    },

    "/devices": {
      post: {
        tags: ["Devices"],
        summary: "Register an FCM device token",
        description:
          "Idempotent: re-sending the same token returns the same record, and " +
          "a token that moves to another account is reassigned rather than " +
          "duplicated.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fcmToken"],
                properties: {
                  fcmToken: { type: "string", minLength: 1, maxLength: 4096 },
                },
                example: { fcmToken: "fXyZ...device-token" },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Device registered.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Device" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      get: {
        tags: ["Devices"],
        summary: "List the caller's registered devices",
        description:
          "Scoped to the authenticated user — a caller can never see another " +
          "account's devices. Tokens are truncated to a preview, so the full " +
          "FCM token is never returned.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "The caller's devices.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    count: { type: "integer" },
                    devices: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          tokenPreview: { type: "string" },
                          tokenLength: { type: "integer" },
                        },
                      },
                    },
                  },
                },
                example: {
                  count: 1,
                  devices: [
                    {
                      id: "e103f275-b993-443c-ace6-99aca899d86f",
                      tokenPreview: "cn10DFUtSHmA…jvx360",
                      tokenLength: 163,
                    },
                  ],
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
};
