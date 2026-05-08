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
                bat 'npm ci'
            }
        }

        stage('Test') {
            steps {
                bat 'npm test'
            }
        }

        stage('Docker Build & Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-hub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    bat """
                        docker build -t %REGISTRY%/%IMAGE_NAME%:%BUILD_NUMBER% .
                        docker login -u %DOCKER_USER% -p %DOCKER_PASS%
                        docker push %REGISTRY%/%IMAGE_NAME%:%BUILD_NUMBER%
                    """
                }
            }
        }

        stage('Deploy') {
            steps {
                bat """
                     kubectl --kubeconfig="C:\\ProgramData\\Jenkins\\.jenkins\\config" set image deployment/logflow-api logflow-api=%REGISTRY%/%IMAGE_NAME%:%BUILD_NUMBER%
                """
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
            bat 'docker logout'
        }
    }
}