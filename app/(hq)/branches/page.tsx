"use client";
import { useState, useEffect } from "react";

type Branch = {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  _count: { orders: number; users: number };
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        setBranches(d.branches || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Kelola Cabang</h1>
        <p className="text-sm text-gray-500 mt-0.5">{branches.length} cabang terdaftar</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{branch.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{branch.city || "—"}</div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ml-2 ${
                    branch.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {branch.isActive ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              {branch.address && (
                <div className="text-xs text-gray-400 mb-3 leading-relaxed">{branch.address}</div>
              )}
              {branch.phone && (
                <div className="text-xs text-gray-500 mb-3">📞 {branch.phone}</div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
                <div className="text-center py-2 bg-gray-50 rounded-xl">
                  <div className="text-lg font-bold text-gray-900">{branch._count.users}</div>
                  <div className="text-xs text-gray-400">Pengguna</div>
                </div>
                <div className="text-center py-2 bg-gray-50 rounded-xl">
                  <div className="text-lg font-bold text-gray-900">{branch._count.orders}</div>
                  <div className="text-xs text-gray-400">Total Order</div>
                </div>
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-400 text-sm">
              Belum ada cabang
            </div>
          )}
        </div>
      )}
    </div>
  );
}
