/**
 * Rank system utilities
 */

export const DEFAULT_RANKS = [
    { min: 100, name: 'دايموند', icon: '<:5:1414254743689236631>', color: '#B9F2FF' },
    { min: 50, name: 'قولد', icon: '<:4:1414254729281671369>', color: '#FFD700' },
    { min: 20, name: 'سلفر', icon: '<:3:1414254714241028177>', color: '#C0C0C0' },
    { min: 10, name: 'برونز', icon: '<:2:1414254695710720121>', color: '#CD7F32' },
    { min: 1, name: 'مبتدئ', icon: '<:classic:1414240683992023173>', color: '#1f8b4c' }
];

export const RANKS = DEFAULT_RANKS;

export const ANIMATED_RANKS = [
    { min: 100, name: 'دايموند', icon: '<a:diamond:1413561016175955988>', color: '#B9F2FF' },
    { min: 50, name: 'قولد', icon: '<a:gold1:1413368904188821554>', color: '#FFD700' },
    { min: 20, name: 'سلفر', icon: '<a:silver2:1412958167603609621>', color: '#C0C0C0' },
    { min: 10, name: 'برونز', icon: '<a:bronze3:1413562890501488721>', color: '#CD7F32' },
    { min: 1, name: 'مبتدئ', icon: '', color: '#1f8b4c' }
];

export const RANK_ICONS = {
    'دايموند': [
        { name: 'نار', icon: '<:5:1414254743689236631>', type: 'classic' },
        { name: 'سندريلا', icon: '<:6:1414254823058051216>', type: 'star' },
        { name: 'قلب', icon: '<:10:1414254886576590878>', type: 'crown' },
        { name: 'بالون', icon: '<:14:1414254943464062978>', type: 'crystal' },
        { name: 'جزر', icon: '<:18:1414255006659641444>', type: 'gzr' }
    ],
    'قولد': [
        { name: 'نار', icon: '<:4:1414254729281671369>', type: 'classic' },
        { name: 'سندريلا', icon: '<:7:1414254805270003914>', type: 'star' },
        { name: 'قلب', icon: '<:__:1414279180345937982>', type: 'crown' },
        { name: 'بالون', icon: '<:15:1414254931069763675>', type: 'crystal' },
        { name: 'جزر', icon: '<:19:1414254993611161661>', type: 'gzr' }
    ],
    'سلفر': [
        { name: 'نار', icon: '<:3:1414254714241028177>', type: 'classic' },
        { name: 'سندريلا', icon: '<:8:1414254780250849431>', type: 'star' },
        { name: 'قلب', icon: '<:12:1414254859548364810>', type: 'crown' },
        { name: 'بالون', icon: '<:16:1414254918432329729>', type: 'crystal' },
        { name: 'جزر', icon: '<:20:1414254980419817533>', type: 'gzr' }
    ],
    'برونز': [
        { name: 'نار', icon: '<:2:1414254695710720121>', type: 'classic' },
        { name: 'سندريلا', icon: '<:9:1414254765579309077>', type: 'star' },
        { name: 'قلب', icon: '<:13:1414254842490392686>', type: 'crown' },
        { name: 'بالون', icon: '<:17:1414254902984704091>', type: 'crystal' },
        { name: 'جزر', icon: '<:21:1414254967388110848>', type: 'gzr' }
    ]
};

export function getRank(streak, guildConfig = null) {
    // Check for custom level bounds (premium)
    if (guildConfig?.premium?.enabled && guildConfig.premium?.levelBounds) {
        const bounds = guildConfig.premium.levelBounds;
        
        // Build custom ranks array from bounds
        const customRanks = [];
        for (const [name, bound] of Object.entries(bounds)) {
            // Find the original rank to get icon and color
            const originalRank = DEFAULT_RANKS.find(r => r.name === name);
            if (originalRank) {
                customRanks.push({
                    min: bound.minStreak,
                    max: bound.maxStreak,
                    name: name,
                    icon: originalRank.icon,
                    color: originalRank.color
                });
            }
        }
        
        // Sort by min descending
        customRanks.sort((a, b) => b.min - a.min);
        
        // Check custom bounds first
        for (let rank of customRanks) {
            const maxStreak = rank.max || Infinity;
            if (streak >= rank.min && streak <= maxStreak) {
                return { min: rank.min, name: rank.name, icon: rank.icon, color: rank.color };
            }
        }
    }
    
    // Fall back to default ranks
    for (let rank of DEFAULT_RANKS) {
        if (streak >= rank.min) {
            return rank;
        }
    }
    return { min: 0, name: 'بدون تصنيف', icon: '⚪', color: '#808080' };
}

export function getAnimatedRank(streak) {
    for (let rank of ANIMATED_RANKS) {
        if (streak >= rank.min) {
            return rank;
        }
    }
    return { min: 0, name: 'بدون تصنيف', icon: '⚪', color: '#808080' };
}

export function getRankWithSelectedIcon(streak, selectedIcon = null, guildConfig = null) {
    const baseRank = getRank(streak, guildConfig);
    
    if (!selectedIcon || streak < 10) {
        return baseRank;
    }
    
    // Check in both default and custom icons
    const defaultIcons = RANK_ICONS[baseRank.name] || [];
    const customIcons = (guildConfig?.premium?.enabled && guildConfig.premium?.customIcons?.[baseRank.name]) 
        ? guildConfig.premium.customIcons[baseRank.name] 
        : [];
    
    const allIcons = [...defaultIcons, ...customIcons];
    
    const foundIcon = allIcons.find(iconData => iconData.icon === selectedIcon);
    if (foundIcon) {
        return { ...baseRank, icon: selectedIcon };
    }
    
    return baseRank;
}

export function findSimilarIconInNewRank(oldIcon, newRankName) {
    const newRankIcons = RANK_ICONS[newRankName];
    if (!newRankIcons) return null;
    
    let iconType = null;
    for (const [rankName, icons] of Object.entries(RANK_ICONS)) {
        const found = icons.find(iconData => iconData.icon === oldIcon);
        if (found) {
            iconType = found.type;
            break;
        }
    }
    
    if (iconType) {
        const similarIcon = newRankIcons.find(iconData => iconData.type === iconType);
        if (similarIcon) return similarIcon.icon;
    }
    
    return newRankIcons[0].icon;
}
