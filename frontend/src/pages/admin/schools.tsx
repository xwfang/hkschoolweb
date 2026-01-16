import { useQuery, useMutation } from "@tanstack/react-query";
import { adminApi } from "@/api/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, RefreshCw, Edit, AlertCircle, Trash2, Globe, Bot } from "lucide-react";
import { useState } from "react";
import { useMetadata } from "@/hooks/use-metadata";

export default function AdminSchoolsPage() {
  const [crawlingId, setCrawlingId] = useState<number | null>(null);
  
  // New states for batch crawl
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [selectedBanding, setSelectedBanding] = useState<string>("");

  const { districts, getDistrictLabel } = useMetadata();

  // Fetch schools
  const { data: schools, isLoading, refetch } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: () => adminApi.getSchools(1, 100),
  });

  // Crawl mutation (Individual School)
  const crawlMutation = useMutation({
    mutationFn: adminApi.crawlSchool,
    onMutate: (id) => setCrawlingId(id),
    onSettled: () => setCrawlingId(null),
    onSuccess: (data) => {
      alert(`Crawl Success!\n${JSON.stringify(data.data, null, 2)}`);
      refetch(); // Refresh list to show updated dates
    },
    onError: (err) => {
      alert("Crawl Failed: " + err);
    }
  });

  // Discover mutation (Global)
  const discoverMutation = useMutation({
    mutationFn: adminApi.crawlDiscover,
    onSuccess: (data) => {
      alert(`Discovery Started!\n${data.message}`);
      refetch();
    },
    onError: (err) => {
      alert("Discovery Failed: " + err);
    }
  });

  // Batch Crawl mutation
  const batchCrawlMutation = useMutation({
    mutationFn: ({ district, banding }: { district: string; banding: string }) => 
      adminApi.crawlBatch(district, banding),
    onSuccess: (data) => {
      alert(`Batch Crawl Started!\n${data.message}`);
      refetch();
    },
    onError: (err) => {
      alert("Batch Crawl Failed: " + err);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteSchool,
    onSuccess: () => {
      refetch();
    },
    onError: (err) => {
      alert("Delete Failed: " + err);
    }
  });

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this school?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <div>Loading schools...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Schools Management</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => discoverMutation.mutate()} 
            variant="default" 
            size="sm"
            disabled={discoverMutation.isPending}
          >
            <Globe className="w-4 h-4 mr-2" /> 
            {discoverMutation.isPending ? "Discovering..." : "Discover New Schools"}
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh List
          </Button>
        </div>
      </div>

      {/* New Crawler Control Panel */}
      <Card className="p-6 bg-white shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-600" />
            Batch Crawler
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">District</label>
                <select 
                    className="flex h-10 w-[200px] items-center justify-between rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                >
                    <option value="">Select District</option>
                    {districts.map(d => (
                        <option key={d.key} value={d.key}>{getDistrictLabel(d.key)}</option>
                    ))}
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 block">Banding</label>
                <select 
                    className="flex h-10 w-[200px] items-center justify-between rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedBanding}
                    onChange={(e) => setSelectedBanding(e.target.value)}
                >
                    <option value="">Select Banding</option>
                    <option value="Band 1">Band 1</option>
                    <option value="Band 2">Band 2</option>
                    <option value="Band 3">Band 3</option>
                </select>
            </div>

            <Button 
                onClick={() => batchCrawlMutation.mutate({ district: selectedDistrict, banding: selectedBanding })}
                disabled={!selectedDistrict || batchCrawlMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
            >
                {batchCrawlMutation.isPending ? "Crawling..." : "Start Batch Crawl"}
            </Button>
        </div>
        <p className="text-sm text-slate-500 mt-2">
            * This will trigger a background job to crawl admission details for all schools in the selected district.
        </p>
      </Card>

      <Card className="overflow-hidden bg-white shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-slate-700">ID</th>
                <th className="px-6 py-4 font-semibold text-slate-700">School Name</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Admission URL</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Admission Info (AI Scraped)</th>
                <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools?.map((school) => (
                <tr key={school.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500">#{school.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    <div>{school.name_en}</div>
                    <div className="text-xs text-slate-500">{school.name_cn}</div>
                  </td>
                  <td className="px-6 py-4">
                    {school.website_admission ? (
                      <a 
                        href={school.website_admission} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center text-blue-600 hover:underline"
                      >
                        Link <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {/* Placeholder for future scraped data fields */}
                    <div className="space-y-1">
                        {/* Simulated data check - in real app, check school.admission_info */}
                        <div className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded w-fit">
                            <AlertCircle className="w-3 h-3 mr-1" /> Not scraped yet
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={!school.website_admission || crawlMutation.isPending}
                        onClick={() => crawlMutation.mutate(school.id)}
                        className={crawlingId === school.id ? "animate-pulse bg-blue-50 text-blue-600" : ""}
                      >
                        {crawlingId === school.id ? (
                           <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                           <RefreshCw className="w-4 h-4 mr-1" />
                        )}
                        {crawlingId === school.id ? "Crawling..." : "Crawl"}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(school.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
