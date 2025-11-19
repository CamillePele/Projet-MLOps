import { useQuery } from '@tanstack/react-query';
import { batchesApi } from '@/api-client';
import { BatchCard } from './BatchCard';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

interface BatchListProps {
    onBatchClick: (batchId: string) => void;
}

export function BatchList({ onBatchClick }: BatchListProps) {
    const { data: batches, isLoading, error } = useQuery({
        queryKey: ['batches'],
        queryFn: async () => {
            return batchesApi.batchControllerFindAll({ limit: 50, offset: 0 });
        },
        refetchInterval: 5000, // Refetch every 5 seconds as backup to WebSocket
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-lg" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold">Error loading batches</h3>
                <p className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : 'Unknown error'}
                </p>
            </div>
        );
    }

    if (!batches || batches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-lg font-medium">No batches found</p>
                <p className="text-sm text-muted-foreground">
                    Upload some images to create your first batch
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => (
                <BatchCard
                    key={batch.id}
                    batch={batch}
                    onClick={() => onBatchClick(batch.id)}
                />
            ))}
        </div>
    );
}
