import '@babel/polyfill'

import axios from 'axios'

const api = axios.create({
  // 바깥에서 주입해준 환경변수를 사용하는 코드
  // 이 컴퓨터에서만 사용할 환경변수를 설정하기 위해서 .env 파일을 편집하면 된다. 
  baseURL: process.env.API_URL
})

api.interceptors.request.use(function (config) {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = 'Bearer ' + token
  }
  return config
});

const templates = {
  loginForm: document.querySelector('#login-form').content,
  postList: document.querySelector('#post-list').content,
  postItem: document.querySelector('#post-item').content,
  postForm: document.querySelector('#post-form').content,
  postDetail: document.querySelector('#post-detail').content,
  commentItem: document.querySelector('#comment-item').content,
}

const rootEl = document.querySelector('.root')

// 페이지 그리는 함수 작성 순서
// 1. 템플릿 복사
// 2. 요소 선택
// 3. 필요한 데이터 불러오기
// 4. 내용 채우기
// 5. 이벤트 리스너 등록하기
// 6. 템플릿을 문서에 삽입

async function drawLoginForm() {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.loginForm, true)

  // 2. 요소 선택
  const formEl = frag.querySelector('.login-form')

  // 3. 필요한 데이터 불러오기 - 필요없음
  // 4. 내용 채우기 - 필요없음
  // 5. 이벤트 리스너 등록하기
  formEl.addEventListener('submit', async e => {
    e.preventDefault()
    const username = e.target.elements.username.value
    const password = e.target.elements.password.value

    const res = await api.post('/users/login', {
      username,
      password
    })

    localStorage.setItem('token', res.data.token)
    drawPostList()
  })

  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = ''
  rootEl.appendChild(frag)
}

async function drawPostList() {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postList, true)

  // 2. 요소 선택
  const listEl = frag.querySelector('.post-list') // tbody선택
  const createEl = frag.querySelector('.create');

  // 3. 필요한 데이터 불러오기
  // data속성을 꺼내와 postList 변수에 할당
  // embed는 자식 불러오기, expand는 부모 불러오기
  const {data: postList} = await api.get('/posts?_expand=user');
  // const res =await api.get('/posts?_embed=user')
  //const postList = res.data 와 같다. 

  // 4. 내용 채우기
  for(const postItem of postList) {
    const frag = document.importNode(templates.postItem, true);

    const idEl = frag.querySelector('.id');
    const titleEl = frag.querySelector('.title');
    const authorEl = frag.querySelector('.author');
    

    idEl.textContent = postItem.id;
    titleEl.textContent = postItem.title;
    authorEl.textContent = postItem.user.username;

    titleEl.addEventListener('click', e => {
      drawPostDetail(postItem.id)
    })

    listEl.appendChild(frag)
  }

  // 5. 이벤트 리스너 등록하기
  createEl.addEventListener('click', e => {
    drawNewPostForm();
  })

  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = ''
  rootEl.appendChild(frag)
}

// 게시물 그리기 
// drawPostDetail에 매개변수가 있는이유는 보여줘야 하는 게시물이 항상 다르기 때문이다.
async function drawPostDetail(postId) {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postDetail, true)

  // 2. 요소 선택
  const titleEl = frag.querySelector('.title');
  const authorEl = frag.querySelector('.author');
  const bodyEl = frag.querySelector('.body');
  const backEl = frag.querySelector('.back');
  const commentListEl = frag.querySelector('.comment-list');
  const commentFormEl = frag.querySelector('.comment-form');


  // 3. 필요한 데이터 불러오기
  // 분해대입
  // data에 title과 body를 빼냄
  // comments에는 서버로부터 받은 배열이 존재하며 배열 안에는 객체가 들어있다.
  const {data: {title, body, user, comments}} = await api.get('/posts/' + postId, {
    params: {
      // 쿼리스트링 넣는방법
      _expand: 'user',
      _embed: 'comments'
    }
  });

  const params = new URLSearchParams() 
  comments.forEach(c => {
    params.append('id', c.userId)
  })
  // userList에는 댓글작성자 배열이 들어있다.
  const {data: userList} = await api.get('/users', {
    params
  })

  // 4. 내용 채우기
  titleEl.textContent = title;
  bodyEl.textContent = body;
  authorEl.textContent = user.username;
  
  // 댓글 표시
  for(const commentItem of comments) {
    // 1. 템플릿 복사
    const frag = document.importNode(templates.commentItem, true);
    // 2. 요소 선택
    const authorEl = frag.querySelector('.author');
    const bodyEl = frag.querySelector('.body');
    const deleteEl = frag.querySelector('.delete');
    
    // 3. 필요한 데이터 불러오기 - 필요없음
    // 4. 내용 채우기
    bodyEl.textContent = commentItem.body

    const user = userList.find(item => item.id === commentItem.userId)
    authorEl.textContent = user.username;

    // 5. 이벤트 리스너 등록하기
    // 6. 템플릿을 문서에 삽입
    commentListEl.appendChild(frag)
  }
  
  // 5. 이벤트 리스너 등록하기
  backEl.addEventListener('click', e => {
    drawPostList();
  })
  // 댓글 추가
  commentFormEl.addEventListener('submit', async e => {
    e.preventDefault();
    const body = e.target.elements.body.value
    await api.post(`/posts/${postId}/comments`, {
      body
    })
    drawPostDetail(postId)
  })

  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = '';
  rootEl.appendChild(frag);
}
 
// 새 글 추가
async function drawNewPostForm() {
  // 1. 템플릿 복사
  const frag = document.importNode(templates.postForm, true);
  // 2. 요소 선택
  const formEl = frag.querySelector('.post-form');

  // 3. 필요한 데이터 불러오기
  // 4. 내용 채우기
  // 5. 이벤트 리스너 등록하기
  formEl.addEventListener('submit', async e => {
    e.preventDefault();
    const title = e.target.elements.title.value;
    const body = e.target.elements.body.value;
    await api.post('/posts', {
      title,
      body
    })
    drawPostList();
  })
  // 6. 템플릿을 문서에 삽입
  rootEl.textContent = '';
  rootEl.appendChild(frag);
}

async function drawEditPostForm(postId) {
  // 1. 템플릿 복사
  // 2. 요소 선택
  // 3. 필요한 데이터 불러오기
  // 4. 내용 채우기
  // 5. 이벤트 리스너 등록하기
  // 6. 템플릿을 문서에 삽입
}

// 페이지 로드 시 그릴 화면 설정
if (localStorage.getItem('token')) {
  drawPostList()
} else {
  drawLoginForm()
}
