/* generated-compatible route tree */
import { Route as root } from './routes/__root'
import { Route as index } from './routes/index'
import { Route as workflows } from './routes/workflows/index'
import { Route as workflow } from './routes/workflows/$workflowId'
import { Route as start } from './routes/workflows/$workflowId/start'
import { Route as auth } from './routes/auth'
import { Route as dashboard } from './routes/dashboard'
import { Route as analyze } from './routes/api/workflows/$workflowId/analyze'
const IndexRoute=index.update({id:'/',path:'/',getParentRoute:()=>root} as any)
const WorkflowsRoute=workflows.update({id:'/workflows/',path:'/workflows/',getParentRoute:()=>root} as any)
const WorkflowRoute=workflow.update({id:'/workflows/$workflowId',path:'/workflows/$workflowId',getParentRoute:()=>root} as any)
const StartRoute=start.update({id:'/workflows/$workflowId/start',path:'/workflows/$workflowId/start',getParentRoute:()=>root} as any)
const AuthRoute=auth.update({id:'/auth',path:'/auth',getParentRoute:()=>root} as any)
const DashboardRoute=dashboard.update({id:'/dashboard',path:'/dashboard',getParentRoute:()=>root} as any)
const AnalyzeRoute=analyze.update({id:'/api/workflows/$workflowId/analyze',path:'/api/workflows/$workflowId/analyze',getParentRoute:()=>root} as any)
export const routeTree=root.addChildren([IndexRoute,WorkflowsRoute,WorkflowRoute,StartRoute,AuthRoute,DashboardRoute,AnalyzeRoute])
