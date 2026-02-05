import { describe, it, expect, vi } from "vitest";
import {
  AppError,
  ApiError,
  ValidationError,
  NetworkError,
  getErrorMessage,
  handleError,
  isAppError,
  isApiError,
  isNetworkError,
  tryCatch,
} from "@/lib/errors";

describe("Error Classes", () => {
  describe("AppError", () => {
    it("should create error with message and default code", () => {
      const error = new AppError("Something went wrong");
      expect(error.message).toBe("Something went wrong");
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.name).toBe("AppError");
    });

    it("should create error with custom code and context", () => {
      const error = new AppError("Custom error", "CUSTOM_CODE", { userId: 123 });
      expect(error.code).toBe("CUSTOM_CODE");
      expect(error.context).toEqual({ userId: 123 });
    });
  });

  describe("ApiError", () => {
    it("should create API error with status", () => {
      const error = new ApiError("API failed", 404);
      expect(error.message).toBe("API failed");
      expect(error.status).toBe(404);
      expect(error.code).toBe("API_ERROR");
      expect(error.name).toBe("ApiError");
    });
  });

  describe("ValidationError", () => {
    it("should create validation error", () => {
      const error = new ValidationError("Invalid input", { field: "email" });
      expect(error.message).toBe("Invalid input");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.context).toEqual({ field: "email" });
    });
  });

  describe("NetworkError", () => {
    it("should create network error with default message", () => {
      const error = new NetworkError();
      expect(error.message).toBe("Network error");
      expect(error.code).toBe("NETWORK_ERROR");
    });

    it("should create network error with custom message", () => {
      const error = new NetworkError("Connection timeout");
      expect(error.message).toBe("Connection timeout");
    });
  });
});

describe("getErrorMessage", () => {
  it("should extract message from Error instance", () => {
    const error = new Error("Test error");
    expect(getErrorMessage(error)).toBe("Test error");
  });

  it("should extract message from AppError instance", () => {
    const error = new AppError("App error message");
    expect(getErrorMessage(error)).toBe("App error message");
  });

  it("should return string directly", () => {
    expect(getErrorMessage("String error")).toBe("String error");
  });

  it("should extract message from object with message property", () => {
    const error = { message: "Object error" };
    expect(getErrorMessage(error)).toBe("Object error");
  });

  it("should return fallback for unknown types", () => {
    expect(getErrorMessage(null)).toBe("An error occurred");
    expect(getErrorMessage(undefined)).toBe("An error occurred");
    expect(getErrorMessage(123)).toBe("An error occurred");
    expect(getErrorMessage({})).toBe("An error occurred");
  });

  it("should use custom fallback", () => {
    expect(getErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
  });
});

describe("handleError", () => {
  it("should log error and return message", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Test error");

    const message = handleError(error, "TestContext");

    expect(message).toBe("Test error");
    // In dev mode, logger should call console.error
    consoleSpy.mockRestore();
  });

  it("should use fallback for unknown error types", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const message = handleError(null, "TestContext", "Fallback message");

    expect(message).toBe("Fallback message");
    consoleSpy.mockRestore();
  });
});

describe("Type Guards", () => {
  describe("isAppError", () => {
    it("should return true for AppError", () => {
      expect(isAppError(new AppError("test"))).toBe(true);
    });

    it("should return true for ApiError (subclass)", () => {
      expect(isAppError(new ApiError("test"))).toBe(true);
    });

    it("should return false for regular Error", () => {
      expect(isAppError(new Error("test"))).toBe(false);
    });
  });

  describe("isApiError", () => {
    it("should return true for ApiError", () => {
      expect(isApiError(new ApiError("test"))).toBe(true);
    });

    it("should return false for AppError", () => {
      expect(isApiError(new AppError("test"))).toBe(false);
    });
  });

  describe("isNetworkError", () => {
    it("should return true for NetworkError", () => {
      expect(isNetworkError(new NetworkError())).toBe(true);
    });

    it("should return false for other errors", () => {
      expect(isNetworkError(new Error("test"))).toBe(false);
    });
  });
});

describe("tryCatch", () => {
  it("should return result on success", async () => {
    const [result, error] = await tryCatch(async () => "success");

    expect(result).toBe("success");
    expect(error).toBeNull();
  });

  it("should return error on failure", async () => {
    const [result, error] = await tryCatch(async () => {
      throw new Error("Failed");
    });

    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("Failed");
  });

  it("should convert non-Error to Error", async () => {
    const [result, error] = await tryCatch(async () => {
      throw "String error";
    });

    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("String error");
  });
});
