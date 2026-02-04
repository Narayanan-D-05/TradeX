'use client';

interface StatsCardProps {
    title: string;
    value: string;
    change?: string;
    icon: string;
    positive?: boolean;
}

export function StatsCard({ title, value, change, icon, positive = true }: StatsCardProps) {
    return (
        <div className="stat-card">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-400 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {change && (
                        <p className={`text-sm mt-1 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {positive ? '↑' : '↓'} {change}
                        </p>
                    )}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gray-800/50 flex items-center justify-center text-2xl">
                    {icon}
                </div>
            </div>
        </div>
    );
}

export function StatsGrid() {
    // Mock stats (would be fetched from contract in production)
    const stats = [
        {
            title: 'Total Volume',
            value: '$1.2M',
            change: '+24% (24h)',
            icon: '📊',
            positive: true,
        },
        {
            title: 'Total Swaps',
            value: '1,847',
            change: '+156 today',
            icon: '🔄',
            positive: true,
        },
        {
            title: 'INR/AED Rate',
            value: '0.044',
            change: '₹22.75 = 1 AED',
            icon: '💱',
            positive: true,
        },
        {
            title: 'Avg. Swap Time',
            value: '42s',
            change: 'vs 3 days (banks)',
            icon: '⚡',
            positive: true,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <StatsCard key={index} {...stat} />
            ))}
        </div>
    );
}
