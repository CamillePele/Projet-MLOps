import {
    AlertCircle, ArrowLeft, ArrowUp, CheckCircle2, Download, Loader2, Wifi, WifiOff
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';

import { batchesApi } from '@/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useBatchSocket } from '@/hooks/useBatchSocket';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { ImageDto } from '@/api/models';

interface BatchDetailProps {
    batchId: string;
    onBack: () => void;
}

export function BatchDetail({ batchId, onBack }: BatchDetailProps) {
    const [showBackToTop, setShowBackToTop] = useState(false);
    const { ref, inView } = useInView();

    // Fetch batch metadata (without images)
    const { data: apiBatch, isLoading } = useQuery({
        queryKey: ['batch', batchId],
        queryFn: async () => {
            return batchesApi.batchControllerFindOne({ id: batchId });
        },
    });

    // Fetch images with infinite scroll
    const {
        data: imagesData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status: imagesStatus,
    } = useInfiniteQuery({
        queryKey: ['batchImages', batchId],
        queryFn: async ({ pageParam = 0 }) => {
            return batchesApi.batchControllerGetBatchImages({
                id: batchId,
                limit: 20,
                offset: pageParam,
            });
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === 20 ? allPages.length * 20 : undefined;
        },
    });

    // Connect to WebSocket for real-time updates
    const { batchData: wsBatch, isConnected } = useBatchSocket(batchId);

    // Merge WebSocket stats with API data
    const batch = wsBatch && apiBatch
        ? { ...apiBatch, ...wsBatch }
        : wsBatch || apiBatch;

    // Handle infinite scroll
    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, fetchNextPage, hasNextPage]);

    // Handle scroll for back to top button
    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 400);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleExportCSV = async () => {
        try {
            const response = await batchesApi.batchControllerExportCSV({ id: batchId });
            // Create a download link
            const blob = new Blob([response as any], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `batch-${batchId}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error exporting CSV:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!batch) {
        return (
            <div className="text-center py-12">
                <p className="text-lg font-medium">Batch not found</p>
            </div>
        );
    }

    const progress = batch?.progress || 0;

    // Flatten all pages of images and deduplicate
    const allImages = imagesData?.pages.flatMap((page) => page) || [];
    const images = Array.from(
        new Map(allImages.map((image: ImageDto) => [image.id, image])).values()
    );

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">Batch {batch.id?.slice(0, 8)}...</h2>
                        <p className="text-sm text-muted-foreground">
                            Created {new Date(batch.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={isConnected ? 'text-green-500' : 'text-gray-500'}>
                        {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                        {isConnected ? 'Live' : 'Offline'}
                    </Badge>
                    <Button onClick={handleExportCSV} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Statistics Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Batch Statistics</CardTitle>
                        <Badge variant="outline" className={getStatusColor(batch.status)}>
                            {getStatusIcon(batch.status)}
                            {batch.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Total Images</p>
                            <p className="text-2xl font-bold">{batch.totalImages}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Processed</p>
                            <p className="text-2xl font-bold">{batch.processedImages}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Successful</p>
                            <p className="text-2xl font-bold text-green-600">{batch.successfulPredictions}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Failed</p>
                            <p className="text-2xl font-bold text-red-600">{batch.failedPredictions}</p>
                        </div>
                    </div>

                    {batch.modelName && (
                        <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground">
                                Model: <span className="font-medium text-foreground">{batch.modelName}</span>
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Images Grid */}
            <Card>
                <CardHeader>
                    <CardTitle>Images ({batch?.totalImages || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                    {imagesStatus === 'pending' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => (
                                <Skeleton key={i} className="aspect-square rounded-md" />
                            ))}
                        </div>
                    ) : imagesStatus === 'error' ? (
                        <p className="text-center text-red-500 py-8">Error loading images</p>
                    ) : images.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No images in this batch</p>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {images.map((image: ImageDto) => (
                                    <ImageCard key={image.id} image={image} />
                                ))}
                            </div>

                            {/* Loading indicator for infinite scroll */}
                            <div ref={ref} className="flex justify-center py-4 mt-4">
                                {isFetchingNextPage && <Skeleton className="h-8 w-8 rounded-full" />}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Back to Top Button */}
            {showBackToTop && (
                <Button
                    onClick={scrollToTop}
                    className="fixed bottom-8 right-8 rounded-full h-12 w-12 shadow-lg z-50"
                    size="icon"
                >
                    <ArrowUp className="h-5 w-5" />
                </Button>
            )}
        </div>
    );
}

function ImageCard({ image }: { image: ImageDto }) {
    const prediction = image.processeds?.[0]?.result;
    const hasError = !prediction;

    return (
        <Card className="overflow-hidden">
            <div className="relative aspect-square">
                <img
                    src={`${import.meta.env.VITE_API_URL}${image.imageUrl}`}
                    alt={image.filename || 'Image'}
                    className="object-cover w-full h-full"
                    loading="lazy"
                />
                <div className="absolute top-2 right-2">
                    {hasError ? (
                        <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Error
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="text-xs bg-green-500/90 text-white">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Done
                        </Badge>
                    )}
                </div>
            </div>
            {prediction && (
                <CardContent className="p-2">
                    <div className="flex flex-wrap gap-1">
                        {prediction.beard && <Badge variant="outline" className="text-[10px] h-4 px-1">Beard</Badge>}
                        {prediction.mustache && <Badge variant="outline" className="text-[10px] h-4 px-1">Mustache</Badge>}
                        {prediction.glasses && <Badge variant="outline" className="text-[10px] h-4 px-1">Glasses</Badge>}
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{prediction.hairColor}</Badge>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">{prediction.hairLength}</Badge>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

function getStatusColor(status: string) {
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
}

function getStatusIcon(status: string) {
    switch (status) {
        case 'completed':
            return <CheckCircle2 className="h-4 w-4 mr-1" />;
        case 'processing':
            return <Loader2 className="h-4 w-4 mr-1 animate-spin" />;
        case 'failed':
            return <AlertCircle className="h-4 w-4 mr-1" />;
        default:
            return null;
    }
}
