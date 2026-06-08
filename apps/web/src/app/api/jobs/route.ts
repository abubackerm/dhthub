import { NextRequest, NextResponse } from 'next/server';
import { jobHelpers, getQueue } from '@/lib/queue/producer';
import type { JobName, JobTypeMap } from '@/lib/queue/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body as { type: JobName; data: JobTypeMap[JobName] };

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      );
    }

    // Using job helpers for specific job types
    switch (type) {
      case 'email':
        await jobHelpers.email.send(data as JobTypeMap['email']);
        break;
      case 'import':
        await jobHelpers.import.queue(data as JobTypeMap['import']);
        break;
      case 'export':
        await jobHelpers.export.queue(data as JobTypeMap['export']);
        break;
      case 'notification':
        await jobHelpers.notification.send(data as JobTypeMap['notification']);
        break;
      case 'image-processing':
        await jobHelpers.imageProcessing.process(data as JobTypeMap['image-processing']);
        break;
      default: {
        // Exhaustive check - this ensures all job types are handled
        const _exhaustiveCheck: never = type;
        throw new Error(`Unknown job type: ${_exhaustiveCheck}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Job of type "${type}" queued successfully`,
    });
  } catch (error) {
    console.error('[API] Error queuing job:', error);
    return NextResponse.json(
      { error: 'Failed to queue job', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const queueName = searchParams.get('queue') as JobName | null;

  try {
    if (queueName) {
      const queue = getQueue(queueName);
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      return NextResponse.json({
        queue: queueName,
        counts: { waiting, active, completed, failed },
      });
    }

    const queues: JobName[] = ['email', 'import', 'export', 'notification', 'image-processing'];
    const stats = await Promise.all(
      queues.map(async (name) => {
        const queue = getQueue(name);
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);
        return { name, waiting, active, completed, failed };
      })
    );

    return NextResponse.json({ queues: stats });
  } catch (error) {
    console.error('[API] Error fetching queue stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue stats', details: (error as Error).message },
      { status: 500 }
    );
  }
}
