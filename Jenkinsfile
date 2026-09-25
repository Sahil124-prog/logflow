// pipeline {
//     agent any

//     environment {
//         IMAGE_NAME = 'logflow-api'
//         REGISTRY = 'docker.io/sahilrajput062004'
//     }

//     stages {

//         stage('Checkout') {
//             steps {
//                 checkout scm
//             }
//         }

//         stage('Install') {
//             steps {
//                 bat 'npm ci'
//             }
//         }

//         stage('Test') {
//             steps {
//                 bat 'npm test'
//             }
//         }

//         stage('Docker Build & Push') {
//             steps {
//                 withCredentials([usernamePassword(
//                     credentialsId: 'docker-hub-credentials',
//                     usernameVariable: 'DOCKER_USER',
//                     passwordVariable: 'DOCKER_PASS'
//                 )]) {
//                     bat """
//                         docker build -t %REGISTRY%/%IMAGE_NAME%:%BUILD_NUMBER% .
//                         docker login -u %DOCKER_USER% -p %DOCKER_PASS%
//                         docker push %REGISTRY%/%IMAGE_NAME%:%BUILD_NUMBER%
//                     """
//                 }
//             }
//         }

//         stage('Deploy') {
//             steps {
//                 bat """
//                      kubectl --kubeconfig="C:\\ProgramData\\Jenkins\\.jenkins\\config" set image deployment/logflow-api logflow-api=%REGISTRY%/%IMAGE_NAME%:%BUILD_NUMBER%
//                 """
//             }
//         }
//     }

//     post {
//         success {
//             echo 'LogFlow deployed successfully!'
            
//             powershell """
//             Invoke-RestMethod -Uri "http://localhost:8081/api/deploys" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"buildNumber": ${env.BUILD_NUMBER}, "imageTag": "${env.IMAGE_NAME}:${env.BUILD_NUMBER}", "status": "success"}'
//             """
//         }
//         failure {
//             echo 'Pipeline failed — LogFlow NOT deployed.'
            
//             powershell """
//             Invoke-RestMethod -Uri "http://localhost:8081/api/deploys" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"buildNumber": ${env.BUILD_NUMBER}, "imageTag": "${env.IMAGE_NAME}:${env.BUILD_NUMBER}", "status": "failed"}'
//             """
//         }
//         always {
//             bat 'docker logout'
//         }
//     }
// }





pipeline {
    agent any

    environment {
        AWS_ACCOUNT_ID = '866972254535'
        AWS_REGION     = 'us-east-1'
        ECR_REGISTRY   = '866972254535.dkr.ecr.us-east-1.amazonaws.com'
    }

    stages {

        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Install') {
            steps { bat 'npm install' }
        }

        stage('Test') {
            steps { bat 'npm test' }
        }

        stage('ECR Login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'aws-ecr-credentials',
                    usernameVariable: 'AWS_ACCESS_KEY_ID',
                    passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                )]) {
                    bat '''
                        aws ecr get-login-password --region %AWS_REGION% | docker login --username AWS --password-stdin %ECR_REGISTRY%
                    '''
                }
            }
        }

        stage('Build & Push Images') {
            steps {
                script {
                    def services = [
                        [name: 'logflow-api',                   context: '.',                          dockerfile: 'dockerfile'],
                        [name: 'logflow-log-ingestion-service', context: '.\\log-ingestion-service',   dockerfile: 'Dockerfile'],
                        [name: 'logflow-alert-service',         context: '.\\alert-service',           dockerfile: 'Dockerfile'],
                        [name: 'logflow-notification-service',  context: '.\\notification-service',    dockerfile: 'Dockerfile'],
                        [name: 'logflow-client',                context: '.\\client',                  dockerfile: 'Dockerfile'],
                        [name: 'logflow-simulator',              context: '.\\services',                dockerfile: 'Dockerfile'],
                    ]

                    for (svc in services) {
                    bat """
                        docker build -f ${svc.context}\\${svc.dockerfile} -t %ECR_REGISTRY%/${svc.name}:%BUILD_NUMBER% ${svc.context}
                        docker push %ECR_REGISTRY%/${svc.name}:%BUILD_NUMBER%
                    """
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                echo 'Deploy stage — pending Phase 3 (EKS cluster). Will call aws eks update-kubeconfig + kubectl set image once the cluster exists.'
            }
        }
    }

    post {
        success {
            echo 'LogFlow build & push succeeded!'
            powershell """
            Invoke-RestMethod -Uri "http://localhost:8081/api/deploys" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"buildNumber": "${env.BUILD_NUMBER}", "status": "success"}'
            """
        }
        failure {
            echo 'Pipeline failed — LogFlow build/push did NOT complete.'
            powershell """
            Invoke-RestMethod -Uri "http://localhost:8081/api/deploys" -Method Post -Headers @{"Content-Type"="application/json"} -Body '{"buildNumber": "${env.BUILD_NUMBER}", "status": "failed"}'
            """
        }
        always {
            bat 'docker logout %ECR_REGISTRY%'
        }
    }
}