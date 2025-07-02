import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Upload, X, Image, Film, File, Check, Info } from 'lucide-react';

interface EventMediaUploaderProps {
  eventId: string;
  onUploadComplete: () => void;
  onCancel: () => void;
}

const EventMediaUploader = ({ eventId, onUploadComplete, onCancel }: EventMediaUploaderProps) => {
  const { user } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; type: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const newPreviews: { url: string; type: string }[] = [];
    const newProgress: number[] = [];

    // Process each file
    Array.from(files).forEach(file => {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError(`File ${file.name} is too large. Maximum size is 50MB.`);
        return;
      }

      // Check file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (!isImage && !isVideo) {
        setError(`File ${file.name} is not a supported media type. Please use images or videos.`);
        return;
      }

      // Add to selected files
      newFiles.push(file);
      newProgress.push(0);

      // Create preview
      if (isImage) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push({ url: reader.result as string, type: 'image' });
          if (newPreviews.length === newFiles.length) {
            setPreviews([...previews, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      } else if (isVideo) {
        // For videos, we'll just show a placeholder
        newPreviews.push({ url: URL.createObjectURL(file), type: 'video' });
        if (newPreviews.length === newFiles.length) {
          setPreviews([...previews, ...newPreviews]);
        }
      }
    });

    setSelectedFiles([...selectedFiles, ...newFiles]);
    setUploadProgress([...uploadProgress, ...newProgress]);
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    const newPreviews = [...previews];
    const newProgress = [...uploadProgress];
    
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    newProgress.splice(index, 1);
    
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    setUploadProgress(newProgress);
  };

  const handleUpload = async () => {
    if (!user || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError('');

      // Upload each file
      const uploads = selectedFiles.map(async (file, index) => {
        // Generate file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${index}.${fileExt}`;
        const filePath = `${eventId}/${fileName}`;
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        // Determine bucket based on file type
        const bucket = isImage ? 'event-images' : 'event-videos';

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, {
            onUploadProgress: (progress) => {
              const newProgress = [...uploadProgress];
              newProgress[index] = Math.round((progress.loaded / progress.total) * 100);
              setUploadProgress(newProgress);
            }
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        // Add record to event_media table
        const { error: insertError } = await supabase
          .from('event_media')
          .insert({
            event_id: eventId,
            user_id: user.id,
            media_url: publicUrl,
            media_type: isImage ? 'image' : isVideo ? 'video' : 'other',
            file_name: file.name,
            file_size: file.size,
            created_at: new Date().toISOString()
          });

        if (insertError) throw insertError;

        return publicUrl;
      });

      await Promise.all(uploads);

      // Notify parent and reset form
      onUploadComplete();
    } catch (err) {
      console.error('Error uploading media:', err);
      setError('Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type === 'image') return <Image className="h-8 w-8 text-blue-500" />;
    if (type === 'video') return <Film className="h-8 w-8 text-purple-500" />;
    return <File className="h-8 w-8 text-neutral-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Upload Event Media</h2>
        <button
          onClick={onCancel}
          className="text-neutral-500 hover:text-neutral-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
          <Info className="h-5 w-5 mr-2 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* File input */}
      <div className="mb-6">
        <div className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center">
          <Upload className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
          <div className="flex text-sm text-neutral-600 justify-center">
            <label className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
              <span>Upload images or videos</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Images (PNG, JPG, GIF, WebP) and videos (MP4, WebM) up to 50MB each
          </p>
        </div>
      </div>

      {/* Preview selected files */}
      {selectedFiles.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-neutral-700 mb-3">
            Selected Files ({selectedFiles.length})
          </h3>
          <div className="space-y-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center bg-neutral-50 p-3 rounded-lg">
                <div className="flex-shrink-0 mr-3">
                  {previews[index]?.type === 'image' ? (
                    <div className="h-12 w-12 rounded overflow-hidden">
                      <img 
                        src={previews[index].url} 
                        alt={`Preview ${index + 1}`} 
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : previews[index]?.type === 'video' ? (
                    <Film className="h-12 w-12 text-purple-500" />
                  ) : (
                    getFileIcon(file.type.split('/')[0])
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {uploading && (
                    <div className="w-full bg-neutral-200 rounded-full h-1.5 mt-1">
                      <div 
                        className="bg-primary-500 h-1.5 rounded-full" 
                        style={{ width: `${uploadProgress[index]}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                
                {!uploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-3 flex-shrink-0 text-neutral-400 hover:text-neutral-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
                
                {uploading && uploadProgress[index] === 100 && (
                  <Check className="ml-3 h-5 w-5 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50"
          disabled={uploading}
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          className="btn-primary flex items-center"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EventMediaUploader;