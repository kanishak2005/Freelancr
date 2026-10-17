import mongoose, { ClientSession } from "mongoose";

const originalStartSession = mongoose.startSession;

/**
 * Executes an operation inside a MongoDB transaction boundary when replica sets or sessions are available.
 * - When mongoose is connected to a replica set (e.g. MongoDB Atlas) or startSession is mocked, executes within session.withTransaction.
 * - In disconnected test environments without session mocking, invokes work without a session.
 */
export async function runInTransaction<T>(
  work: (session?: ClientSession) => Promise<T>
): Promise<T> {
  const isConnected = mongoose.connection?.readyState === 1;
  const isMocked = mongoose.startSession !== originalStartSession;
  const isProd = process.env.NODE_ENV === "production";

  if (isConnected || isMocked) {
    try {
      const session = await mongoose.startSession();
      try {
        let result: T;
        await session.withTransaction(async () => {
          result = await work(session);
        });
        return result!;
      } finally {
        await session.endSession();
      }
    } catch (err: any) {
      // In production, multi-document transaction failure must never fall back silently to non-transactional execution
      if (isProd) {
        throw new Error(
          `Transaction execution failed in production environment: ${err?.message || "Transaction aborted"}`
        );
      }
      throw err;
    }
  }

  if (isProd) {
    throw new Error(
      "MongoDB replica set session required for transaction execution in production environment"
    );
  }

  // Safe unit test fallback for disconnected mock harnesses
  return work();
}
