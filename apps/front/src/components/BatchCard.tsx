import type { BatchDto } from '@/api/models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface BatchCardProps {
    batch: BatchDto;
    onClick?: () => void;
}

export function BatchCard({ batch, onClick }: BatchCardProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'processing':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'failed':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            default:
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-4 w-4" />;
            case 'processing':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            case 'failed':
                return <AlertCircle className="h-4 w-4" />;
            default:
                return <Clock className="h-4 w-4" />;
        }
    };

    const progress = batch.progress || 0;

    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={onClick}
        >
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-medium">
                            Batch {batch.id?.slice(0, 8)}...
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                            {new Date(batch.createdAt).toLocaleString()}
                        </p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(batch.status)}>
                        <span className="flex items-center gap-1">
                            {getStatusIcon(batch.status)}
                            {batch.status}
                        </span>
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Total Images</p>
                        <p className="font-medium">{batch.totalImages}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Processed</p>
                        <p className="font-medium">{batch.processedImages}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Successful</p>
                        <p className="font-medium text-green-600">{batch.successfulPredictions}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">Failed</p>
                        <p className="font-medium text-red-600">{batch.failedPredictions}</p>
                    </div>
                </div>

                {batch.modelName && (
                    <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">
                            Model: <span className="font-medium text-foreground">{batch.modelName}</span>
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
