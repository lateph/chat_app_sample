
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/login.vue') },
      { path: '/signup', component: () => import('pages/signup.vue') },
      { path: '/feeds', component: () => import('pages/chatList.vue') },
      { path: '/createChat', component: () => import('pages/createChat.vue') },
      { path: '/createGroup', component: () => import('pages/createGroup.vue') },
      { path: '/createGroupDetail', component: () => import('pages/createGroupDetail.vue') },
      { path: '/detail/:id', component: () => import('pages/chatDetail.vue') }
    ]
  }
]

// Always leave this as last one
if (process.env.MODE !== 'ssr') {
  routes.push({
    path: '*',
    component: () => import('pages/Error404.vue')
  })
}

export default routes
