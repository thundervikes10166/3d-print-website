import React from 'react';
import { useLab } from '../context/LabContext';
import { Listing } from '../types';

interface ProductCardProps {
  product: Listing;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { navigateTo } = useLab();

  const title = product.title || product.name || 'Custom 3D Print';
  const priceDisplay =
    product.priceType === 'quote'
      ? 'Custom Quote'
      : `$${(product.price ?? product.priceAmount ?? 0).toFixed(2)}`;

  return (
    <div
      onClick={() => navigateTo('product_detail', { productId: product.id })}
      className="group bg-white rounded-lg border border-slate-200 hover:border-[#C41E3A] overflow-hidden flex flex-col transition-all cursor-pointer shadow-xs hover:shadow-md"
    >
      {/* 1. Photo */}
      <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
        <img
          src={product.imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80';
          }}
        />
      </div>

      {/* Card Body: Name, Material, Estimated Delivery, Description, Price */}
      <div className="p-4 flex flex-col grow justify-between space-y-3">
        <div className="space-y-2">
          {/* 2. Name */}
          <h3 className="font-extrabold text-sm uppercase tracking-tight text-slate-900 group-hover:text-[#C41E3A] transition-colors line-clamp-1">
            {title}
          </h3>

          {/* 3. Material & 4. Estimated Delivery */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[#C41E3A] bg-red-50 px-2 py-0.5 rounded border border-red-100">
              {product.material || 'PLA'}
            </span>
            <span className="text-slate-600 font-medium">
              {product.estimatedProductionTime || '2-3 Days'}
            </span>
          </div>

          {/* 5. Description */}
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* 6. Price & Primary Action */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-base font-extrabold font-mono text-slate-900">
            {priceDisplay}
          </span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigateTo('product_detail', { productId: product.id });
            }}
            className="px-3 py-1.5 bg-[#C41E3A] hover:bg-[#A0182E] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-xs"
          >
            Request Quote
          </button>
        </div>
      </div>
    </div>
  );
};
