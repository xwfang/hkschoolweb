import { useAuthStore } from "@/store/auth";
import { useQuery } from "@tanstack/react-query";
import { childrenApi } from "@/api/children";
import { ChevronDown, Plus, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ChildSwitcher() {
  const { currentChildId, setCurrentChildId } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const { data: children } = useQuery({
    queryKey: ["children"],
    queryFn: childrenApi.list,
  });

  const currentChild = children?.find(c => c.id === currentChildId);

  return (
    <div className="relative">
      <div 
        className="flex items-center gap-2 cursor-pointer active:opacity-70"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center border border-indigo-200">
           <User className="h-4 w-4 text-indigo-600" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <h2 className="text-base font-bold text-gray-900 leading-none">
              {currentChild ? currentChild.name : "请选择子女"}
            </h2>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </div>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50 py-1 animate-in fade-in zoom-in-95 duration-200">
            {children?.map(child => (
              <div
                key={child.id}
                className={`px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${currentChildId === child.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}
                onClick={() => {
                  setCurrentChildId(child.id);
                  setIsOpen(false);
                }}
              >
                <span>{child.name}</span>
                {currentChildId === child.id && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" />}
              </div>
            ))}
            <div className="border-t mt-1 pt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-xs text-gray-500 h-9 px-4"
                onClick={() => {
                  navigate("/app/profile/add-child");
                  setIsOpen(false);
                }}
              >
                <Plus className="h-3 w-3 mr-2" />
                添加子女档案
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
