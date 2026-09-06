import { enCommon } from './common'
import { enDashboard } from './dashboard'
import { enTransactions } from './transactions'
import { enDebts } from './debts'
import { enInvestments } from './investments'
import { enGoals } from './goals'
import { enBudgets } from './budgets'
import { enAlerts } from './alerts'
import { enSettings } from './settings'
import { enAuth } from './auth'
import { enLearn } from './learn'
import { enZakat } from './zakat'
import { enFire } from './fire'
import { enHelp } from './help'
import { enLanding } from './landing'
import { enPolicies } from './policies'
import { enDownload } from './download'
import { enChat } from './chat'

export const en = {
    ...enCommon,
    ...enDashboard,
    ...enTransactions,
    ...enDebts,
    ...enInvestments,
    ...enGoals,
    ...enBudgets,
    ...enAlerts,
    ...enSettings,
    ...enAuth,
    ...enLearn,
    ...enZakat,
    ...enFire,
    ...enHelp,
    ...enLanding,
    ...enPolicies,
    ...enDownload,
    ...enChat,
} as const

export type En = typeof en
