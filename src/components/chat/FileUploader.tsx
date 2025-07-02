import React, { useState, useRef } from 'react';
import { Upload, X, File, Image } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface FileUploaderProps {
  messageId?: string;
  onFileUploaded: (fileUrl: string, fileName: string, fileType: string) => void;
  onClose: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ messageId, onFileUploaded, onClose }) => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !user) return;

    try {
      setUploading(true);

      // Generate unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      // Save attachment record if messageId is provided
      if (messageId) {
        const { error: attachmentError } = await supabase
          .from('message_attachments')
          .insert({
            message_id: messageId,
            user_id: user.id,
            file_name: selectedFile.name,
            file_url: publicUrl,
            file_type: selectedFile.type,
            file_size: selectedFile.size
          });

        if (attachmentError) console.error('Error saving attachment record:', attachmentError);
      }

      onFileUploaded(publicUrl, selectedFile.name, selectedFile.type);
      onClose();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border border-neutral-200 p-4 z-50 w-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-neutral-900">Upload File</h3>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
          <p className="text-sm text-neutral-600 mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-neutral-500">
            Images, PDFs, documents up to 50MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* File preview */}
          <div className="border border-neutral-200 rounded-lg p-3">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-32 object-cover rounded-md"
              />
            ) : (
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {selectedFile.type.startsWith('image/') ? (
                    <Image className="h-8 w-8 text-blue-500" />
                  ) : (
                    <File className="h-8 w-8 text-neutral-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
              }}
              className="flex-1 px-3 py-2 border border-neutral-300 text-neutral-700 rounded-md text-sm hover:bg-neutral-50"
            >
              Change
            </button>
            <button
              onClick={uploadFile}
              disabled={uploading}
              className="flex-1 px-3 py-2 bg-primary-500 text-white rounded-md text-sm hover:bg-primary-600 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;