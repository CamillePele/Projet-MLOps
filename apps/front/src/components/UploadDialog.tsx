import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileArchive, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { uploadApi } from '@/api-client';

export function UploadDialog() {
    const [open, setOpen] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const { mutate: uploadFiles, isPending } = useMutation({
        mutationFn: async (filesToUpload: File[]) => {
            // Upload all files using uploadControllerUploadImages
            // The API handles both individual images and ZIP archives
            const promises = filesToUpload.map(file =>
                uploadApi.uploadControllerUploadImages({ file })
            );
            return Promise.all(promises);
        },
        onSuccess: () => {
            toast.success('Upload successful');
            setFiles([]);
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ['images'] });
        },
        onError: (error) => {
            console.error(error);
            toast.error('Upload failed');
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleUpload = () => {
        if (files.length === 0) return;
        uploadFiles(files);
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Images
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Upload Images</DialogTitle>
                    <DialogDescription>
                        Upload one or more images (PNG, JPG) or a ZIP archive.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div
                        className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            multiple
                            accept="image/*,.zip"
                            onChange={handleFileChange}
                        />
                        <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                Click to select files
                            </p>
                        </div>
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {files.map((file, i) => (
                                <div key={i} className="flex items-center justify-between p-2 border rounded-md">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        {file.name.endsWith('.zip') ? (
                                            <FileArchive className="h-4 w-4 flex-shrink-0" />
                                        ) : (
                                            <ImageIcon className="h-4 w-4 flex-shrink-0" />
                                        )}
                                        <span className="text-sm truncate">{file.name}</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(i);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setFiles([])} disabled={isPending}>
                        Clear
                    </Button>
                    <Button onClick={handleUpload} disabled={files.length === 0 || isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Upload {files.length > 0 && `(${files.length})`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
