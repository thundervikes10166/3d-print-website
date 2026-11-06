import React from 'react';
import { CustomRequest } from '../types';

/** Keep uploaded reference photos distinct from external STL / photo links. */
export const RequestReferenceAttachments: React.FC<{
  request: Pick<CustomRequest, 'referenceImageUrl' | 'referenceFileUrl'>;
}> = ({ request }) => {
  if (!request.referenceImageUrl && !request.referenceFileUrl) return null;

  return (
    <div className="space-y-2 text-xs">
      {request.referenceImageUrl && (
        <div className="space-y-1">
          <div className="font-semibold text-slate-700">Uploaded reference image</div>
          <a href={request.referenceImageUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
            <img
              src={request.referenceImageUrl}
              alt="Customer reference for requested print"
              loading="lazy"
              className="w-full max-w-56 max-h-44 object-contain rounded border border-slate-200 bg-white"
            />
            <span className="mt-1 block text-[#C41E3A] underline">View full image</span>
          </a>
        </div>
      )}
      {request.referenceFileUrl && (
        <a href={request.referenceFileUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-[#C41E3A] font-semibold underline break-all">
          Open STL / photo link
        </a>
      )}
    </div>
  );
};
