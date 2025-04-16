import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

// 데이터베이스 초기화 함수
async function initializeDatabase() {
    try {
        // 기존 데이터 삭제
        await clearCollections([
            'serviceRequests',
            'workLogs',
            'messages',
            'users',
            'notifications'
        ]);

        // 기본 사용자 생성
        await createDefaultUsers();

        // 개발 계획 업데이트
        await updateDevelopmentPlan();

        console.log('데이터베이스 초기화 완료');
    } catch (error) {
        console.error('데이터베이스 초기화 실패:', error);
    }
}

// 컬렉션 데이터 삭제
async function clearCollections(collections) {
    for (const collectionName of collections) {
        const snapshot = await getDocs(collection(db, collectionName));
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log(`${collectionName} 컬렉션 데이터 삭제 완료`);
    }
}

// 기본 사용자 생성
async function createDefaultUsers() {
    const users = [
        {
            email: 'worker1@example.com',
            password: 'password123',
            userType: 'worker',
            name: '김철수',
            phone: '010-1234-5678',
            registrationType: 'individual',
            regions: ['서울', '경기'],
            services: ['청소', '이사'],
            experience: 3,
            equipment: ['청소기', '진공청소기'],
            createdAt: new Date()
        },
        {
            email: 'worker2@example.com',
            password: 'password123',
            userType: 'worker',
            name: '이영희',
            phone: '010-8765-4321',
            registrationType: 'business',
            businessNumber: '123-45-67890',
            representativeName: '이영희',
            businessAddress: '서울시 강남구',
            taxEmail: 'tax@example.com',
            regions: ['서울', '인천'],
            services: ['이사', '수리'],
            experience: 5,
            equipment: ['트럭', '수리도구'],
            createdAt: new Date()
        }
    ];

    for (const user of users) {
        // Firebase Authentication에 사용자 생성
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            user.email,
            user.password
        );

        // Firestore에 사용자 정보 저장
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            ...user,
            updatedAt: new Date()
        });
    }
    console.log('기본 사용자 생성 완료');
}

// 개발 계획 업데이트
async function updateDevelopmentPlan() {
    const developmentPlan = {
        '2024-04-09': [
            '프로젝트 구조 정리',
            '개발 계획 문서 작성',
            'Legacy 웹앱 구조 분석',
            '웹앱 기본 구조 설정',
            'Firebase 연동'
        ],
        '2024-04-10': [
            '사용자 인증 시스템 구현',
            '로그인/회원가입 페이지',
            'Firebase Authentication 연동',
            '사용자 프로필 관리'
        ],
        '2024-04-11': [
            '작업자 등록 시스템 구현',
            '개인/법인 구분 등록 폼',
            '서비스 지역 선택',
            '서비스 종류 선택',
            '장비 정보 입력'
        ],
        '2024-04-12': [
            '작업자 대시보드 구현',
            '작업 일정 캘린더',
            '작업 지도',
            '실시간 알림',
            '작업 상태 관리'
        ]
    };

    try {
        await setDoc(doc(db, 'system', 'developmentPlan'), {
            plan: developmentPlan,
            lastUpdated: new Date()
        });
        console.log('개발 계획 업데이트 완료');
    } catch (error) {
        console.error('개발 계획 업데이트 실패:', error);
    }
}

// 초기화 실행
initializeDatabase(); 