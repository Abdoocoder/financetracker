import { arCommon } from './common'
import { arDashboard } from './dashboard'
import { arTransactions } from './transactions'
import { arDebts } from './debts'
import { arInvestments } from './investments'
import { arGoals } from './goals'
import { arBudgets } from './budgets'
import { arAlerts } from './alerts'
import { arSettings } from './settings'
import { arAuth } from './auth'
import { arLearn } from './learn'
import { arZakat } from './zakat'
import { arFire } from './fire'
import { arHelp } from './help'
import { arLanding } from './landing'
import { arPolicies } from './policies'
import { arDownload } from './download'
import { arChat } from './chat'

export const ar = {
    ...arCommon,
    ...arDashboard,
    ...arTransactions,
    ...arDebts,
    ...arInvestments,
    ...arGoals,
    ...arBudgets,
    ...arAlerts,
    ...arSettings,
    ...arAuth,
    ...arLearn,
    ...arZakat,
    ...arFire,
    ...arHelp,
    ...arLanding,
    ...arPolicies,
    ...arDownload,
    ...arChat,
} as const

export type Ar = typeof ar
