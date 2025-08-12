import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCmfCkNC6yYCTXKRJlbwOxMKiYlrp7eb_Q",
    authDomain: "pegboard-app-49230.firebaseapp.com",
    projectId: "pegboard-app-49230",
    storageBucket: "pegboard-app-49230.firebasestorage.app",
    messagingSenderId: "746526920837",
    appId: "1:746526920837:web:0860854169249bd13419ec"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const firebaseService = {
    addPost: async (post) => {
        try {
            const docRef = await addDoc(collection(db, 'posts'), {
                ...post,
                createdAt: new Date()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding post:', error);
        }
    },

    updatePost: async (id, updates) => {
        try {
            const postRef = doc(db, 'posts', id);
            await updateDoc(postRef, updates);
        } catch (error) {
            console.error('Error updating post:', error);
        }
    },

    deletePost: async (id) => {
        try {
            await deleteDoc(doc(db, 'posts', id));
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    },

    onPostsChange: (callback) => {
        const q = query(collection(db, 'posts'), orderBy('createdAt', 'asc'));
        return onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            callback(posts);
        });
    }
};