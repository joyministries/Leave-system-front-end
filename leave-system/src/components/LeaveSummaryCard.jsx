
export const LeaveSummaryCard = ({ summary = [] }) => {
    // Handle both array and object formats
    const summaryData = Array.isArray(summary) ? summary : Object.values(summary || {});

    if (!summaryData || summaryData.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow border border-slate-200 p-4 text-center">
                <p className="text-slate-500 text-sm">No leave summary available</p>
            </div>
        );
    }

    const getRowStyle = (item) => {
        const isActive = item.is_active !== false;
        const status = item.status;
        const remainingDays = item.remaining_days || 0;

        // Grey: Not in use (inactive or no remaining days)
        if (!isActive || remainingDays === 0) {
            return {
                bg: 'bg-slate-50',
                statusIcon: '⚪',
                statusLabel: 'Not in Use',
                progressBar: 'bg-slate-400'
            };
        }

        // Orange: Pending status
        if (status?.toLowerCase() === 'pending') {
            return {
                bg: 'bg-orange-50',
                statusIcon: '🟠',
                statusLabel: 'Pending',
                progressBar: 'bg-orange-500'
            };
        }

        // Green: Active and available
        if (isActive) {
            return {
                bg: 'bg-green-50',
                statusIcon: '🟢',
                statusLabel: 'Active',
                progressBar: 'bg-green-600'
            };
        }

        // Default fallback
        return {
            bg: 'bg-blue-50',
            statusIcon: '🔵',
            statusLabel: 'Available',
            progressBar: 'bg-blue-600'
        };
    };

    return (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Leave Type</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Used</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Remaining</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Usage</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summaryData.map((item, index) => {
                            const totalDays = item.total_days || item.total || 0;
                            const usedDays = item.used_days || item.used || 0;
                            const remainingDays = item.remaining_days || item.remaining || (totalDays - usedDays);
                            const leaveType = item.leave_type_name || `Leave Type ${index + 1}`;
                            const usagePercent = totalDays > 0 ? Math.round((usedDays / totalDays) * 100) : 0;

                            const style = getRowStyle(item);

                            return (
                                <tr key={index} className={`${style.bg} border-t border-slate-200 hover:shadow-sm transition-shadow`}>
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{leaveType}</td>
                                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900">{totalDays}</td>
                                    <td className="px-4 py-3 text-center text-sm font-semibold text-red-600">{usedDays}</td>
                                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-900">{remainingDays}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-white rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${style.progressBar}`}
                                                    style={{ width: `${usagePercent}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap w-8 text-right">{usagePercent}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{style.statusIcon}</span>
                                            <span className="text-xs font-semibold text-slate-700">{style.statusLabel}</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary Footer */}
            <div className="bg-slate-100 border-t border-slate-300 px-4 py-2">
                <p className="text-xs text-slate-700">
                    <span className="font-semibold">💡</span> Track your leave balance regularly
                </p>
            </div>
        </div>
    );
}