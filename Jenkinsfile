pipeline {
    agent any

    environment {
        IMAGE_NAME = 'logflow-api'
        REGISTRY = 'docker.io/sahilrajput062004'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Docker Build & Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-hub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        docker build -t ${env.REGISTRY}/${env.IMAGE_NAME}:${BUILD_NUMBER} .
                        docker login -u $DOCKER_USER -p $DOCKER_PASS
                        docker push ${env.REGISTRY}/${env.IMAGE_NAME}:${BUILD_NUMBER}
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    kubectl set image deployment/logflow-api \
                    logflow-api=${env.REGISTRY}/${env.IMAGE_NAME}:${BUILD_NUMBER}
                '''
            }
        }
    }

    post {
        success {
            echo 'LogFlow deployed successfully!'
        }
        failure {
            echo 'Pipeline failed — LogFlow NOT deployed.'
        }
        always {
            sh 'docker logout'
        }
    }
}


