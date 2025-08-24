import { Users, Phone } from "lucide-react";

interface ReturnClient {
  id: string;
  name: string;
  mobile: string;
  count: number;
}

export default function ReturnClientsTable({ clients }: { clients: ReturnClient[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-blue-600" />
        Top Returning Clients
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Clients with the most repeated completed appointments
      </p>

      {clients.length === 0 ? (
        <p className="text-gray-500 text-sm">No returning clients yet</p>
      ) : (
        <div className="space-y-4">
          {clients.map((c, i) => (
            <div
              key={c.id}
              className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
            >
              {/* Top row */}
              <div className="flex justify-between items-center">
                {/* Client Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-600">🏅</span>
                    <p className="font-medium text-gray-800">{c.name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <Phone size={14} className="text-green-600" />
                    <span>{c.mobile}</span>
                  </div>
                </div>

                {/* Right side stats */}
                <div className="text-right">
                  <p className="text-green-600 font-semibold">{c.count} visits</p>
                  <p className="text-xs text-gray-500">
                    {c.count > 1 ? "Returning Client" : "First Timer"}
                  </p>
                </div>
              </div>

              {/* Bottom row */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200 text-sm">
                <span className="text-gray-500">Average visits per year</span>
                <span className="text-gray-800 font-medium">
                  {(c.count / 1).toFixed(1)} {/* Placeholder: you can replace with real calc */}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
