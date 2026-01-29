import prisma from "@/prisma/prisma";
import { Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "", {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "test-run",
  async (job) => {
    const data = job.data as { suiteId: string };
    const suite = await prisma.testSuite.findUnique({
      where: { id: data.suiteId },
    });

    if (!suite) {
      throw new Error("Test suite not found");
    }
    // run the test suite here
    console.log(suite);
  },
  { connection },
);
