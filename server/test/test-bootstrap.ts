import mongoose from "mongoose";

// 1. Establish test environment flags before application modules load
process.env.NODE_ENV = "test";
process.env.FREELANCR_TEST_DB_BYPASS = "true";

// 2. Read configured application database URI for guard comparison (without exposing secrets)
const appMongoUri = process.env.MONGODB_URI;

// 3. Configure Mongoose buffering to fail immediately in tests rather than hanging for 10s
mongoose.set("bufferCommands", false);
mongoose.set("bufferTimeoutMS", 500);

// 4. Intercept direct mongoose.connect calls to prevent connection to application database
const originalMongooseConnect = mongoose.connect.bind(mongoose);

(mongoose as any).connect = async (uri: string, options?: any) => {
  // If no URI or matching configured application database URI, reject fail-closed
  if (!uri || (appMongoUri && uri === appMongoUri)) {
    const error = new Error(
      "[TEST SAFETY VIOLATION] Attempted to connect to application database during unit/regression test. Direct connections to MONGODB_URI are strictly forbidden in test mode."
    );
    throw error;
  }

  // Permit dedicated replica-set URI ONLY if TEST_MONGODB_REPLICA_SET_URI is explicitly set and matches
  const replicaSetUri = process.env.TEST_MONGODB_REPLICA_SET_URI;
  if (replicaSetUri && uri === replicaSetUri) {
    if (uri === appMongoUri) {
      throw new Error(
        "[TEST SAFETY VIOLATION] TEST_MONGODB_REPLICA_SET_URI matches MONGODB_URI! Aborting connection."
      );
    }
    return originalMongooseConnect(uri, options);
  }

  throw new Error(
    "[TEST SAFETY VIOLATION] Unexpected mongoose.connect call with unapproved URI in test mode."
  );
};
